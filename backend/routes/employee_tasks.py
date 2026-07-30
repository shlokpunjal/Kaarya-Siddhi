from fastapi import APIRouter, Depends, HTTPException
from supabase_client import supabase
from auth_utils import get_current_user, validate_cloudinary_url
from notify_utils import create_notification

router = APIRouter()


def _get_own_id(email: str) -> str:
    user = supabase.table("users").select("id").eq("email", email).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    return user.data[0]["id"]


def _check_ownership(task_id: str, own_id: str):
    task = supabase.table("tasks").select("created_by, assigned_to").eq("id", task_id).execute()
    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    if own_id not in (task.data[0]["created_by"], task.data[0]["assigned_to"]):
        raise HTTPException(status_code=403, detail="Not your task.")


@router.get("/tasks/{task_id}")
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    own_id = _get_own_id(current_user["sub"])
    _check_ownership(task_id, own_id)
    result = supabase.table("tasks").select("*").eq("id", task_id).execute()
    return result.data[0]


@router.post("/tasks/self")
async def create_self_task(payload: dict, current_user: dict = Depends(get_current_user)):
    user = supabase.table("users").select("id, workspace_id").eq("email", current_user["sub"]).execute()
    if not user.data or not user.data[0].get("workspace_id"):
        raise HTTPException(status_code=400, detail="Could not find your workspace.")

    row = user.data[0]
    result = (
        supabase.table("tasks")
        .insert({
            "title": payload.get("title"),
            "assigned_to": row["id"],
            "deadline": payload.get("deadline"),
            "description": payload.get("description"),
            "attachment_url": validate_cloudinary_url(payload.get("attachment_url")),
            "status": "pending",
            "priority": payload.get("priority", "medium"),
            "created_by": row["id"],
            "workspace_id": row["workspace_id"],
        })
        .select()
        .execute()
    )
    return result.data[0]


@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    own_id = _get_own_id(current_user["sub"])
    _check_ownership(task_id, own_id)

    allowed = {"title", "deadline", "description", "attachment_url", "priority", "assigned_to", "status", "suggestion", "completed_at"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    # Reassignment is an admin-only action. Previously any owner/assignee
    # (i.e. any employee who owned or was assigned the task) could hand
    # their own task off to an arbitrary user_id via this same field.
    if "assigned_to" in updates and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reassign a task.")

    result = supabase.table("tasks").update(updates).eq("id", task_id).select().execute()
    return result.data[0]

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    own_id = _get_own_id(current_user["sub"])
    _check_ownership(task_id, own_id)

    supabase.table("task_files").delete().eq("task_id", task_id).execute()
    supabase.table("task_submissions").delete().eq("task_id", task_id).execute()
    supabase.table("extension_requests").delete().eq("task_id", task_id).execute()
    supabase.table("notifications").delete().eq("task_id", task_id).execute()
    supabase.table("tasks").delete().eq("id", task_id).execute()

    return {"deleted": True}


@router.post("/task-files")
async def add_task_files(payload: list[dict], current_user: dict = Depends(get_current_user)):
    # Previously had no check at all that the task belonged to the
    # caller — any authenticated user could attach file records to any
    # task_id. Verify ownership of every distinct task_id in the batch
    # before inserting any of it.
    own_id = _get_own_id(current_user["sub"])
    task_ids = {row.get("task_id") for row in payload if row.get("task_id")}
    if not task_ids:
        raise HTTPException(status_code=400, detail="task_id is required for each file.")
    for task_id in task_ids:
        _check_ownership(task_id, own_id)

    result = supabase.table("task_files").insert(payload).execute()
    return result.data

@router.post("/tasks/assign")
async def create_assigned_task(payload: dict, current_user: dict = Depends(get_current_user)):
    admin = supabase.table("users").select("id, workspace_id").eq("email", current_user["sub"]).execute()
    if not admin.data or not admin.data[0].get("workspace_id"):
        raise HTTPException(status_code=400, detail="Could not find your workspace.")
    row = admin.data[0]

    result = (
        supabase.table("tasks")
        .insert({
            "title": payload.get("title"),
            "assigned_to": payload.get("assigned_to"),
            "deadline": payload.get("deadline"),
            "description": payload.get("description"),
            "attachment_url": validate_cloudinary_url(payload.get("attachment_url")),
            "status": "pending",
            "priority": payload.get("priority", "medium"),
            "created_by": row["id"],
            "workspace_id": row["workspace_id"],
        })
        .select()
        .execute()
    )
    return result.data[0]


@router.get("/employees-directory")
async def get_employees_directory(current_user: dict = Depends(get_current_user)):
    admin = supabase.table("users").select("workspace_id").eq("email", current_user["sub"]).execute()
    if not admin.data or not admin.data[0].get("workspace_id"):
        return []
    result = (
        supabase.table("users")
        .select("id, name")
        .eq("role", "employee")
        .eq("workspace_id", admin.data[0]["workspace_id"])
        .order("name", desc=False)
        .execute()
    )
    return result.data

@router.get("/tasks/{task_id}/detail")
async def get_task_detail(task_id: str, current_user: dict = Depends(get_current_user)):
    own_id = _get_own_id(current_user["sub"])
    _check_ownership(task_id, own_id)

    task = supabase.table("tasks").select("*").eq("id", task_id).execute().data[0]
    files = supabase.table("task_files").select("*").eq("task_id", task_id).execute().data or []

    def _resolve_name(user_id):
        if not user_id:
            return None
        u = supabase.table("users").select("name, email").eq("id", user_id).execute()
        if not u.data:
            return user_id
        return u.data[0].get("name") or u.data[0].get("email") or user_id

    return {
        "task": task,
        "files": files,
        "assigned_by_name": _resolve_name(task.get("created_by")),
        "assigned_to_name": _resolve_name(task.get("assigned_to")),
    }

@router.get("/tasks/{task_id}/pending-extension")
async def get_pending_extension(task_id: str, current_user: dict = Depends(get_current_user)):
    result = (
        supabase.table("extension_requests")
        .select("id")
        .eq("task_id", task_id)
        .eq("status", "pending")
        .execute()
    )
    return {"pending": bool(result.data)}


@router.post("/tasks/{task_id}/ask-review")
async def ask_for_review(task_id: str, current_user: dict = Depends(get_current_user)):
    own_id = _get_own_id(current_user["sub"])
    _check_ownership(task_id, own_id)

    task = supabase.table("tasks").select("*").eq("id", task_id).execute().data[0]

    supabase.table("task_submissions").insert({
        "task_id": task_id,
        "submitted_by": own_id,
        "note": "Requested review via app",
    }).execute()

    supabase.table("tasks").update({"status": "in_review"}).eq("id", task_id).execute()

    recipients = {task.get("assigned_to"), task.get("created_by")} - {None}
    if recipients:
        message = f'"{task["title"]}" has been submitted for review.'
        # The submission itself is already saved above — a failure here
        # must not turn into an error for the employee who just
        # successfully submitted their work for review.
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