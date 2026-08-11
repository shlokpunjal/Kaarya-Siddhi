import json
from typing import Annotated, Literal, Optional, get_args

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator
from supabase_client import supabase
from auth_utils import get_current_user
from notify_utils import create_notification, push_only, delete_notifications

router = APIRouter()

# Keep in sync with lib/notify.ts NotificationType — anything not in this
# list is rejected (as a 422, via the Pydantic model below) rather than
# silently written, so a caller can't invent a fake type (e.g. spoofing
# "extension_accepted" they never earned).
NotifyType = Literal[
    "connection_request", "connection_pending", "connection_accepted", "connection_rejected",
    "extension_request", "extension_accepted", "extension_rejected",
    "task_assigned", "task_in_review", "deadline", "overdue", "eoffice_pending",
]
# Kept around as a plain set for any call site that still wants to check
# membership without importing the Literal itself.
ALLOWED_NOTIFY_TYPES = set(get_args(NotifyType))

IdStr = Annotated[str, Field(min_length=1, max_length=100)]

# metadata/data are free-form dicts (arbitrary extra context for a push/
# notification), so they can't get a fixed schema — but "free-form"
# shouldn't mean "unbounded". Cap key count and total serialized size so
# a client can't smuggle a huge blob through here.
MAX_METADATA_KEYS = 20
MAX_METADATA_BYTES = 4096
MAX_NOTIFICATION_IDS_PER_DELETE = 200


def _validate_bounded_dict(value: dict) -> dict:
    if len(value) > MAX_METADATA_KEYS:
        raise ValueError(f"metadata/data can have at most {MAX_METADATA_KEYS} keys.")
    try:
        size = len(json.dumps(value, default=str))
    except (TypeError, ValueError):
        raise ValueError("metadata/data must be JSON-serializable.")
    if size > MAX_METADATA_BYTES:
        raise ValueError(f"metadata/data is too large (max {MAX_METADATA_BYTES} bytes serialized).")
    return value


class NotifyIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    userId: IdStr
    type: NotifyType
    message: str = Field(..., min_length=1, max_length=2000)
    taskId: Optional[IdStr] = None
    metadata: dict = Field(default_factory=dict)

    @field_validator("metadata")
    @classmethod
    def _check_metadata_size(cls, v: dict) -> dict:
        return _validate_bounded_dict(v)


class PushOnlyIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    userId: IdStr
    title: str = Field("Notification", max_length=200)
    body: str = Field("", max_length=2000)
    data: dict = Field(default_factory=dict)

    @field_validator("data")
    @classmethod
    def _check_data_size(cls, v: dict) -> dict:
        return _validate_bounded_dict(v)


def _same_workspace_or_self(caller_row: dict, target_user_id: str) -> bool:
    """The caller can notify themself, or someone in their own workspace
    (their connected admin/employees) — never an arbitrary user_id."""
    if target_user_id == caller_row["id"]:
        return True
    if not caller_row.get("workspace_id"):
        return False
    target = supabase.table("users").select("workspace_id").eq("id", target_user_id).execute()
    return bool(target.data) and target.data[0].get("workspace_id") == caller_row["workspace_id"]


def _require_same_workspace_target(target_user_id: str, current_user: dict) -> None:
    """Only let a caller notify someone in their own workspace. Without
    this, userId was taken straight from the request body with no
    relationship check at all — any authenticated user (or a modified
    client reusing a legitimate token) could push arbitrary text to any
    other user in the system, including admins in other workspaces."""
    caller = supabase.table("users").select("id, workspace_id").eq("email", current_user["sub"]).execute()
    if not caller.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    caller_row = caller.data[0]

    target = supabase.table("users").select("id, workspace_id").eq("id", target_user_id).execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="Recipient not found.")

    if (
        not caller_row.get("workspace_id")
        or target.data[0].get("workspace_id") != caller_row["workspace_id"]
    ):
        raise HTTPException(status_code=403, detail="Recipient is not in your workspace.")


@router.post("/notify")
async def create_notification_route(payload: NotifyIn, current_user: dict = Depends(get_current_user)):
    caller = supabase.table("users").select("id, workspace_id").eq("email", current_user["sub"]).execute()
    if not caller.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    if not _same_workspace_or_self(caller.data[0], payload.userId):
        raise HTTPException(status_code=403, detail="Can't notify a user outside your workspace.")

<<<<<<< HEAD
    create_notification(payload.userId, payload.type, payload.message, task_id=payload.taskId, metadata=payload.metadata)
=======
    _require_same_workspace_target(user_id, current_user)

    task_id = payload.get("taskId")
    metadata = payload.get("metadata", {})

    create_notification(user_id, type_, message, task_id=task_id, metadata=metadata)
>>>>>>> origin/fix/security-review-findings
    return {"success": True}


@router.post("/notify-push-only")
async def push_only_route(payload: PushOnlyIn, current_user: dict = Depends(get_current_user)):
    # Push without a notifications row — for cases like extension requests
    # where the request row itself is the record; a notifications row
    # would just be a duplicate.
    caller = supabase.table("users").select("id, workspace_id").eq("email", current_user["sub"]).execute()
    if not caller.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    if not _same_workspace_or_self(caller.data[0], payload.userId):
        raise HTTPException(status_code=403, detail="Can't notify a user outside your workspace.")

<<<<<<< HEAD
    push_only(payload.userId, payload.title, payload.body, data=payload.data)
=======
    _require_same_workspace_target(user_id, current_user)

    title = payload.get("title", "Notification")
    body = payload.get("body", "")
    data = payload.get("data", {})
    push_only(user_id, title, body, data=data)
>>>>>>> origin/fix/security-review-findings
    return {"success": True}


@router.delete("/notify-pending")
<<<<<<< HEAD
async def delete_pending_notifications(
    task_id: str = Query(..., max_length=100),
    type: str = Query(..., max_length=50),
    current_user: dict = Depends(get_current_user),
):
    own_id_row = supabase.table("users").select("id").eq("email", current_user["sub"]).execute()
    if not own_id_row.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = own_id_row.data[0]["id"]
=======
async def delete_pending_notifications(task_id: str, type: str, current_user: dict = Depends(get_current_user)):
    # Previously deleted by type/task_id with no user_id filter at all —
    # any authenticated user could clear another user's pending
    # notifications for a task they have no relationship to. Scope it to
    # tasks the caller actually owns or is assigned.
    caller = supabase.table("users").select("id").eq("email", current_user["sub"]).execute()
    if not caller.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = caller.data[0]["id"]
>>>>>>> origin/fix/security-review-findings

    task = supabase.table("tasks").select("created_by, assigned_to").eq("id", task_id).execute()
    if not task.data:
        raise HTTPException(status_code=404, detail="Task not found.")
    if own_id not in (task.data[0]["created_by"], task.data[0]["assigned_to"]):
        raise HTTPException(status_code=403, detail="Not your task.")

    delete_notifications(notif_type=type, task_id=task_id)
    return {"success": True}


@router.get("/notifications")
async def list_notifications(
    types: str | None = Query(None, max_length=500),
    current_user: dict = Depends(get_current_user),
):
    try:
        user = supabase.table("users").select("id").eq("email", current_user["sub"]).execute()
    except Exception:
        raise HTTPException(status_code=503, detail="Could not load notifications right now.")

    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = user.data[0]["id"]

    try:
        query = (
            supabase.table("notifications")
            .select("id, type, message, created_at, metadata, task_id")
            .eq("user_id", own_id)
            .order("created_at", desc=True)
        )
        if types:
            query = query.in_("type", types.split(","))

        result = query.execute()
    except Exception:
        raise HTTPException(status_code=503, detail="Could not load notifications right now.")

    return result.data


@router.delete("/notifications")
async def delete_notifications_route(
    ids: str = Query(..., max_length=8000),
    current_user: dict = Depends(get_current_user),
):
    try:
        user = supabase.table("users").select("id").eq("email", current_user["sub"]).execute()
    except Exception:
        raise HTTPException(status_code=503, detail="Could not clear notifications right now.")

    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = user.data[0]["id"]

    id_list = [i for i in ids.split(",") if i]
    if not id_list:
        return {"deleted": True}
    if len(id_list) > MAX_NOTIFICATION_IDS_PER_DELETE:
        raise HTTPException(
            status_code=400,
            detail=f"Too many ids in one request (max {MAX_NOTIFICATION_IDS_PER_DELETE}).",
        )

    try:
        # Scoped to the caller's own user_id — can't delete someone else's
        # notifications even if they somehow guessed another notification's id.
        supabase.table("notifications").delete().eq("user_id", own_id).in_("id", id_list).execute()
    except Exception:
        raise HTTPException(status_code=503, detail="Could not clear notifications right now.")

    return {"deleted": True}