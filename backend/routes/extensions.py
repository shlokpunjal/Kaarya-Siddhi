from datetime import datetime, timezone
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from supabase_client import supabase
from auth_utils import get_current_user
from notify_utils import create_notification, push_only, delete_notifications

router = APIRouter()

# Same rationale as employee_tasks.py: explicit max_length on every
# string field so a client can't send oversized text into the DB.
IdStr = Annotated[str, Field(min_length=1, max_length=100)]
DateStr = Annotated[str, Field(min_length=1, max_length=40)]


class ExtensionDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: Literal["accepted", "rejected"]
    admin_note: Optional[str] = Field(None, max_length=2000)


class ExtensionRequestCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    task_id: IdStr
    requested_deadline: DateStr
    reason: Optional[str] = Field(None, max_length=2000)


def _require_admin_for_request(row: dict, current_user: dict) -> None:
    """Only an admin in the same workspace as the extension request may
    view or decide it. Without this, any logged-in user could read or
    act on any workspace's extension requests just by guessing/incrementing
    request_id."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can do that.")

    admin = supabase.table("users").select("workspace_id").eq("email", current_user["sub"]).execute()
    if not admin.data or admin.data[0].get("workspace_id") != row.get("workspace_id"):
        raise HTTPException(status_code=403, detail="Not your workspace.")


@router.get("/extension-requests/{request_id}")
async def get_extension_request(request_id: str, current_user: dict = Depends(get_current_user)):
    user = supabase.table("users").select("id, role, workspace_id").eq("email", current_user["sub"]).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own = user.data[0]

    req = supabase.table("extension_requests").select("*").eq("id", request_id).execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found.")
    row = req.data[0]
    _require_admin_for_request(row, current_user)

    is_requester = row.get("requested_by") == own["id"]
    is_workspace_admin = own.get("role") == "admin" and row.get("workspace_id") == own.get("workspace_id")
    if not (is_requester or is_workspace_admin):
        raise HTTPException(status_code=403, detail="Not authorized to view this request.")

    task = None
    if row.get("task_id"):
        t = supabase.table("tasks").select("title, priority, assigned_to, deadline").eq("id", row["task_id"]).execute()
        task = t.data[0] if t.data else None

    requester_name = None
    if row.get("requested_by"):
        u = supabase.table("users").select("name").eq("id", row["requested_by"]).execute()
        requester_name = u.data[0]["name"] if u.data else None

    return {**row, "tasks": task, "requester": {"name": requester_name}}


@router.post("/extension-requests/{request_id}/decide")
async def decide_extension_request(request_id: str, payload: ExtensionDecision, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can decide extension requests.")

    decision = payload.decision

    admin = supabase.table("users").select("id, workspace_id").eq("email", current_user["sub"]).execute()
    if not admin.data or not admin.data[0].get("workspace_id"):
        raise HTTPException(status_code=403, detail="No workspace.")
    admin_workspace_id = admin.data[0]["workspace_id"]

    note = payload.admin_note
    decided_at = datetime.now(timezone.utc).isoformat()

    req = supabase.table("extension_requests").select("*").eq("id", request_id).execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found.")
    row = req.data[0]
    _require_admin_for_request(row, current_user)

    if row.get("workspace_id") != admin_workspace_id:
        raise HTTPException(status_code=403, detail="Not your workspace.")

    supabase.table("extension_requests").update({
        "status": decision, "admin_note": note, "decided_at": decided_at
    }).eq("id", request_id).execute()

    if decision == "accepted" and row.get("task_id"):
        supabase.table("tasks").update({
            "deadline": row["requested_deadline"], "deadline_reminder_sent": False
        }).eq("id", row["task_id"]).execute()

    # Clear the pending "new extension request" push-only event for this
    # request. NOTE: extension_request events are push-only (see
    # create_extension_request below) — no notifications row is ever
    # written for them, so this delete is a no-op today. Left in place
    # (as a safe best-effort call, not a raw query) in case that ever
    # changes; it must never be able to fail the decide action itself.
    delete_notifications(notif_type="extension_request", metadata_match={"extension_request_id": request_id})

    task_title = "your task"
    if row.get("task_id"):
        t = supabase.table("tasks").select("title").eq("id", row["task_id"]).execute()
        if t.data:
            task_title = t.data[0]["title"]

    message = (
        f'Your extension request for "{task_title}" was accepted.'
        if decision == "accepted"
        else f'Your extension request for "{task_title}" was rejected.'
    )
    notif_type = "extension_accepted" if decision == "accepted" else "extension_rejected"

    if row.get("requested_by"):
        create_notification(
            row["requested_by"],
            notif_type,
            message,
            task_id=row.get("task_id"),
            metadata={"extension_request_id": request_id},
            title=f"Extension {decision.capitalize()}",
        )

    return {"status": decision, "admin_note": note, "decided_at": decided_at}


@router.post("/extension-requests")
async def create_extension_request(payload: ExtensionRequestCreate, current_user: dict = Depends(get_current_user)):
    user = supabase.table("users").select("id").eq("email", current_user["sub"]).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = user.data[0]["id"]

    task_id = payload.task_id
    task = supabase.table("tasks").select("*").eq("id", task_id).execute()
    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    task_row = task.data[0]

    if task_row.get("assigned_to") != own_id:
        raise HTTPException(status_code=403, detail="Not your task.")

    if not task_row.get("deadline"):
        raise HTTPException(
            status_code=400,
            detail="This task has no deadline set, so an extension can't be requested.",
        )

    try:
        result = (
            supabase.table("extension_requests")
            .insert({
                "task_id": task_id,
                "requested_by": own_id,
                "workspace_id": task_row["workspace_id"],
                "current_deadline": task_row.get("deadline"),
                "requested_deadline": payload.requested_deadline,
                "reason": payload.reason,
            })
            .select()
            .execute()
        )
    except Exception as e:
        print(f"[extension-requests] insert failed: {repr(e)}")
        if "23505" in str(e) or "duplicate" in str(e).lower():
            raise HTTPException(status_code=409, detail="A pending extension request already exists for this task.")
        if "23502" in str(e):
            raise HTTPException(status_code=400, detail="Missing required task information for this request.")
        raise HTTPException(status_code=500, detail="Could not submit your request.")

    inserted = result.data[0]

    # The extension request itself is already saved at this point — a
    # failure notifying admins about it must not turn into an error for
    # the employee who just successfully submitted it.
    try:
        admins = (
            supabase.table("users")
            .select("id")
            .eq("workspace_id", task_row["workspace_id"])
            .eq("role", "admin")
            .execute()
        )
        for admin in admins.data or []:
            # Push-only (no notifications row) — the extension_requests row
            # itself is the record; the admin's Requests screen reads
            # pending requests straight from that table, not from
            # `notifications`.
            push_only(
                admin["id"],
                "New Extension Request",
                f'A new deadline extension was requested for "{task_row["title"]}".',
                data={"type": "extension_request", "extension_request_id": inserted["id"], "taskId": task_id},
            )
    except Exception as e:
        print(f"Failed to notify admins of new extension request {inserted['id']}: {e}")

    return inserted