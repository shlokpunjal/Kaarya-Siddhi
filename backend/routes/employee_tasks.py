import asyncio
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from supabase_client import supabase, run_db
from auth_utils import get_current_user, validate_cloudinary_url
from notify_utils import create_notification

router = APIRouter()


# --- Request models ----------------------------------------------------
# `extra="forbid"` on every model so an unexpected field in the request
# body is a 422 instead of being silently ignored (or, worse, silently
# accepted somewhere a raw dict would have let it through).
#
# NOTE on `priority`/`status` value sets: inferred from where they're
# read elsewhere in the backend (pdf_report.py's STATUS_COLORS, the
# "medium" default here). Confirm these match the frontend's actual enum
# before relying on this as the source of truth.
#
# Every string field has an explicit max_length so a malicious or buggy
# client can't send multi-megabyte text into a title, remark, etc. and
# waste DB/server resources. Reasonable, generous ceilings chosen per
# field's purpose — short for IDs/dates, longer for free text.

Priority = Literal["low", "medium", "high"]
TaskStatus = Literal["pending", "in_review", "completed", "overdue"]

# Supabase/Postgres UUIDs are 36 chars; this leaves headroom without
# allowing arbitrarily long junk in an id-shaped field.
IdStr = Annotated[str, Field(min_length=1, max_length=100)]
# ISO date or datetime string, generous enough for any timezone suffix.
DateStr = Annotated[str, Field(min_length=1, max_length=40)]
# Typical practical URL length ceiling (browsers cap around 2000-8000).
UrlStr = Annotated[str, Field(min_length=1, max_length=2048)]

# Max number of file records accepted in a single /task-files request —
# guards against someone submitting an enormous batch in one call.
MAX_TASK_FILES_PER_REQUEST = 20


class SelfTaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(..., min_length=1, max_length=300)
    deadline: Optional[DateStr] = None
    description: Optional[str] = Field(None, max_length=5000)
    attachment_url: Optional[UrlStr] = None
    priority: Priority = "medium"


class AssignedTaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(..., min_length=1, max_length=300)
    assigned_to: IdStr
    deadline: Optional[DateStr] = None
    description: Optional[str] = Field(None, max_length=5000)
    attachment_url: Optional[UrlStr] = None
    priority: Priority = "medium"
    # Set (to the same value across a batch of requests) only when the
    # frontend's "Team" assign mode fans one task out per employee — lets
    # /tasks/{id}/detail resolve and show teammates. Absent for a normal
    # single-employee assignment.
    team_batch_id: Optional[Annotated[str, Field(max_length=64)]] = None


class TaskUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    deadline: Optional[DateStr] = None
    description: Optional[str] = Field(None, max_length=5000)
    attachment_url: Optional[UrlStr] = None
    priority: Optional[Priority] = None
    assigned_to: Optional[IdStr] = None
    status: Optional[TaskStatus] = None
    suggestion: Optional[str] = Field(None, max_length=2000)
    completed_at: Optional[DateStr] = None


class TaskFileIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    task_id: IdStr
    file_url: UrlStr
    file_name: Optional[str] = Field(None, max_length=300)


async def _get_own_id(email: str) -> str:
    user = await run_db(supabase.table("users").select("id").eq("email", email))
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    return user.data[0]["id"]


async def _check_ownership(task_id: str, own_id: str):
    task = await run_db(
        supabase.table("tasks").select("created_by, assigned_to").eq("id", task_id)
    )
    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    if own_id not in (task.data[0]["created_by"], task.data[0]["assigned_to"]):
        raise HTTPException(status_code=403, detail="Not your task.")


async def _check_tasks_access_in_workspace(task_ids: set[str], own_id: str, workspace_id: str | None):
    """Stricter than _check_ownership: also requires each task to belong to
    the caller's own workspace, not just that the caller is the creator or
    assignee. Used anywhere a client-supplied set of task_ids drives a
    write — validates all of them in a single batched query rather than
    one query per id (this replaced a per-id loop that was a real N+1:
    a 20-file upload batch meant 20 separate round trips to validate
    tasks that could be fetched in one .in_() query)."""
    if not task_ids:
        return
    tasks = await run_db(
        supabase.table("tasks")
        .select("id, created_by, assigned_to, workspace_id")
        .in_("id", list(task_ids))
    )
    rows_by_id = {row["id"]: row for row in (tasks.data or [])}

    for task_id in task_ids:
        row = rows_by_id.get(task_id)
        if not row:
            raise HTTPException(status_code=404, detail="Task not found.")
        if own_id not in (row["created_by"], row["assigned_to"]):
            raise HTTPException(status_code=403, detail="Not your task.")
        if not workspace_id or row.get("workspace_id") != workspace_id:
            raise HTTPException(status_code=403, detail="Task does not belong to your workspace.")


@router.get("/tasks/{task_id}")
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    own_id = await _get_own_id(current_user["sub"])
    await _check_ownership(task_id, own_id)
    result = await run_db(supabase.table("tasks").select("*").eq("id", task_id))
    return result.data[0]


@router.post("/tasks/self")
async def create_self_task(payload: SelfTaskCreate, current_user: dict = Depends(get_current_user)):
    user = await run_db(
        supabase.table("users").select("id, workspace_id").eq("email", current_user["sub"])
    )
    if not user.data or not user.data[0].get("workspace_id"):
        raise HTTPException(status_code=400, detail="Could not find your workspace.")

    row = user.data[0]
    result = await run_db(
        supabase.table("tasks")
        .insert({
            "title": payload.title,
            "assigned_to": row["id"],
            "deadline": payload.deadline,
            "description": payload.description,
            "attachment_url": validate_cloudinary_url(payload.attachment_url),
            "status": "pending",
            "priority": payload.priority,
            "created_by": row["id"],
            "workspace_id": row["workspace_id"],
        })
        .select()
    )
    return result.data[0]


@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, current_user: dict = Depends(get_current_user)):
    own_id = await _get_own_id(current_user["sub"])
    task = await run_db(
        supabase.table("tasks").select("created_by, assigned_to").eq("id", task_id)
    )
    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    row = task.data[0]

    if own_id == row["created_by"]:
        # Creator (admin assigning, or an employee editing their own self-task)
        # can edit everything, including admin feedback.
        allowed = {"title", "deadline", "description", "attachment_url", "priority", "assigned_to", "status", "suggestion", "completed_at"}
    elif own_id == row["assigned_to"]:
        # Pure assignee can only report progress on the task, not rewrite it.
        allowed = {"status", "completed_at"}
    else:
        raise HTTPException(status_code=403, detail="Not your task.")

    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    if "assigned_to" in updates:
        # Reassignment is an admin action, same rules as POST /tasks/assign —
        # a creator editing their own self-task can't use this field to hand
        # it to a coworker or another workspace's employee.
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can reassign tasks.")

        # Caller's own workspace_id and the target employee's row are
        # independent reads — fetch both concurrently instead of one
        # after the other.
        admin_task, employee_task = await asyncio.gather(
            run_db(supabase.table("users").select("workspace_id").eq("id", own_id)),
            run_db(
                supabase.table("users")
                .select("id, role, workspace_id")
                .eq("id", updates["assigned_to"])
            ),
        )
        admin_workspace_id = admin_task.data[0].get("workspace_id") if admin_task.data else None
        employee = employee_task
        if (
            not employee.data
            or employee.data[0].get("role") != "employee"
            or employee.data[0].get("workspace_id") != admin_workspace_id
        ):
            raise HTTPException(status_code=403, detail="That employee is not part of your workspace.")

    result = await run_db(supabase.table("tasks").update(updates).eq("id", task_id).select())
    return result.data[0]

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    own_id = await _get_own_id(current_user["sub"])
    task = await run_db(supabase.table("tasks").select("created_by").eq("id", task_id))
    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.data[0]["created_by"] != own_id:
        # Only the person who created the task (admin, or the employee on
        # their own self-task) can delete it — being the assignee isn't enough.
        raise HTTPException(status_code=403, detail="Only the task creator can delete this task.")

    # Four independent deletes across unrelated tables, all scoped to the
    # same task_id — nothing here depends on another finishing first, so
    # run them concurrently instead of one round trip after another.
    await asyncio.gather(
        run_db(supabase.table("task_files").delete().eq("task_id", task_id)),
        run_db(supabase.table("task_submissions").delete().eq("task_id", task_id)),
        run_db(supabase.table("extension_requests").delete().eq("task_id", task_id)),
        run_db(supabase.table("notifications").delete().eq("task_id", task_id)),
    )
    # The tasks row itself must go last — foreign keys from the tables
    # above reference it, so deleting it before (or concurrently with)
    # those deletes would risk a foreign-key violation.
    await run_db(supabase.table("tasks").delete().eq("id", task_id))

    return {"deleted": True}


@router.post("/task-files")
async def add_task_files(payload: list[TaskFileIn], current_user: dict = Depends(get_current_user)):
    if not payload:
        raise HTTPException(status_code=400, detail="No file records provided.")
    if len(payload) > MAX_TASK_FILES_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files in one request (max {MAX_TASK_FILES_PER_REQUEST}).",
        )

    user = await run_db(
        supabase.table("users").select("id, workspace_id").eq("email", current_user["sub"])
    )
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = user.data[0]["id"]
    workspace_id = user.data[0].get("workspace_id")

    # Every file record must name a task, and that task must be one the
    # caller can access (creator or assignee) within their own workspace —
    # otherwise a manipulated request could attach files to someone else's
    # task. Validated in one batched query rather than one query per
    # distinct task_id.
    task_ids = {f.task_id for f in payload}
    await _check_tasks_access_in_workspace(task_ids, own_id, workspace_id)

    result = await run_db(supabase.table("task_files").insert([f.model_dump() for f in payload]))
    return result.data

@router.post("/tasks/assign")
async def create_assigned_task(payload: AssignedTaskCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign tasks.")

    admin = await run_db(
        supabase.table("users").select("id, workspace_id").eq("email", current_user["sub"])
    )
    if not admin.data or not admin.data[0].get("workspace_id"):
        raise HTTPException(status_code=400, detail="Could not find your workspace.")
    row = admin.data[0]

    employee = await run_db(
        supabase.table("users")
        .select("id, role, workspace_id")
        .eq("id", payload.assigned_to)
    )
    if (
        not employee.data
        or employee.data[0].get("role") != "employee"
        or employee.data[0].get("workspace_id") != row["workspace_id"]
    ):
        # Covers both a manipulated request pointing at another workspace's
        # employee, and one pointing at a non-employee (e.g. another admin).
        raise HTTPException(status_code=403, detail="That employee is not part of your workspace.")

    result = await run_db(
        supabase.table("tasks")
        .insert({
            "title": payload.title,
            "assigned_to": payload.assigned_to,
            "deadline": payload.deadline,
            "description": payload.description,
            "attachment_url": validate_cloudinary_url(payload.attachment_url),
            "status": "pending",
            "priority": payload.priority,
            "created_by": row["id"],
            "workspace_id": row["workspace_id"],
            "team_batch_id": payload.team_batch_id,
        })
        .select()
    )
    return result.data[0]


@router.get("/employees-directory")
async def get_employees_directory(current_user: dict = Depends(get_current_user)):
    admin = await run_db(
        supabase.table("users").select("workspace_id").eq("email", current_user["sub"])
    )
    if not admin.data or not admin.data[0].get("workspace_id"):
        return []
    result = await run_db(
        supabase.table("users")
        .select("id, name")
        .eq("role", "employee")
        .eq("workspace_id", admin.data[0]["workspace_id"])
        .order("name", desc=False)
    )
    return result.data

@router.get("/tasks/{task_id}/detail")
async def get_task_detail(task_id: str, current_user: dict = Depends(get_current_user)):
    own_id = await _get_own_id(current_user["sub"])
    await _check_ownership(task_id, own_id)

    # The task row and its attached files are independent reads (files
    # only needs task_id, which we already have from the path) — fetch
    # both concurrently instead of one after the other.
    task_result, files_result = await asyncio.gather(
        run_db(supabase.table("tasks").select("*").eq("id", task_id)),
        run_db(supabase.table("task_files").select("*").eq("task_id", task_id)),
    )
    task = task_result.data[0]
    files = files_result.data or []

    # Previously two separate queries (one per id) run one after another.
    # created_by and assigned_to are both just user ids — resolve both in
    # a single batched query instead.
    name_ids = {uid for uid in (task.get("created_by"), task.get("assigned_to")) if uid}
    names_by_id: dict[str, dict] = {}
    if name_ids:
        users_result = await run_db(
            supabase.table("users").select("id, name, email").in_("id", list(name_ids))
        )
        names_by_id = {u["id"]: u for u in (users_result.data or [])}

    def _resolve_name(user_id):
        if not user_id:
            return None
        u = names_by_id.get(user_id)
        if not u:
            return user_id
        return u.get("name") or u.get("email") or user_id

    # Team tasks: resolve siblings created in the same "Team" assign-mode
    # batch (see AssignedTaskCreate.team_batch_id) so the detail screen can
    # show "who else is on this task" — each teammate's name and their own
    # progress on their copy of the task.
    teammates: list[dict] = []
    team_batch_id = task.get("team_batch_id")
    if team_batch_id:
        siblings_result = await run_db(
            supabase.table("tasks")
            .select("id, assigned_to, status")
            .eq("team_batch_id", team_batch_id)
            .eq("workspace_id", task.get("workspace_id"))
            .neq("id", task_id)
        )
        siblings = siblings_result.data or []
        sibling_assignee_ids = {s["assigned_to"] for s in siblings if s.get("assigned_to")}
        if sibling_assignee_ids:
            sibling_users = await run_db(
                supabase.table("users")
                .select("id, name, email")
                .in_("id", list(sibling_assignee_ids))
            )
            sibling_names_by_id = {u["id"]: u for u in (sibling_users.data or [])}

            def _resolve_sibling_name(user_id):
                u = sibling_names_by_id.get(user_id)
                if not u:
                    return user_id
                return u.get("name") or u.get("email") or user_id

            teammates = [
                {
                    "task_id": s["id"],
                    "employee_id": s["assigned_to"],
                    "name": _resolve_sibling_name(s["assigned_to"]),
                    "status": s.get("status"),
                }
                for s in siblings
                if s.get("assigned_to")
            ]

    return {
        "task": task,
        "files": files,
        "assigned_by_name": _resolve_name(task.get("created_by")),
        "assigned_to_name": _resolve_name(task.get("assigned_to")),
        "teammates": teammates,
    }

# AFTER — reuses the same _check_ownership() helper already used elsewhere in this file
@router.get("/tasks/{task_id}/pending-extension")
async def get_pending_extension(task_id: str, current_user: dict = Depends(get_current_user)):
    own_id = await _get_own_id(current_user["sub"])
    await _check_ownership(task_id, own_id)

    result = await run_db(
        supabase.table("extension_requests")
        .select("id")
        .eq("task_id", task_id)
        .eq("status", "pending")
    )
    return {"pending": bool(result.data)}

@router.post("/tasks/{task_id}/ask-review")
async def ask_for_review(task_id: str, current_user: dict = Depends(get_current_user)):
    own_id = await _get_own_id(current_user["sub"])
    await _check_ownership(task_id, own_id)

    task_result = await run_db(supabase.table("tasks").select("*").eq("id", task_id))
    task = task_result.data[0]

    await run_db(
        supabase.table("task_submissions").insert({
            "task_id": task_id,
            "submitted_by": own_id,
            "note": "Requested review via app",
        })
    )

    await run_db(supabase.table("tasks").update({"status": "in_review"}).eq("id", task_id))

    recipients = {task.get("assigned_to"), task.get("created_by")} - {None}
    if recipients:
        message = f'"{task["title"]}" has been submitted for review.'
        # The submission itself is already saved above — a failure here
        # must not turn into an error for the employee who just
        # successfully submitted their work for review.
        # NOTE: create_notification() itself still does its DB insert +
        # push send synchronously/blocking (see notify_utils.py) — it's
        # called from several other route files too, so converting it to
        # run off the event loop is a separate, coordinated change rather
        # than something to do only here. With at most 2 recipients this
        # loop's contribution to request latency is small, but it's not
        # yet off the event loop the way the calls above now are.
        try:
            for uid in recipients:
                create_notification(
                    uid,
                    "task_in_review",
                    message,
                    task_id=task_id,
                    title="Task submitted for review",
                    send_push=(uid != own_id),  # don't buzz the person who just submitted it
                )
        except Exception as e:
            print(f"Failed to notify recipients of task {task_id} in review: {e}")

    return {"status": "in_review"}