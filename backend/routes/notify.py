from fastapi import APIRouter, Depends
from supabase_client import supabase
from auth_utils import get_current_user
import httpx
from fastapi import HTTPException
router = APIRouter()

TITLES = {
    "extension_accepted": "Extension Accepted",
    "extension_rejected": "Extension Rejected",
    "task_assigned": "New Task Assigned",
}


async def _send_push(user_id: str, title: str, body: str, data: dict):
    user = supabase.table("users").select("expo_push_token").eq("id", user_id).execute()
    token = user.data[0]["expo_push_token"] if user.data else None
    if not token:
        return
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://exp.host/--/api/v2/push/send",
            json={"to": token, "title": title, "body": body, "sound": "default", "data": data},
        )


@router.post("/notify")
async def create_notification(payload: dict, current_user: dict = Depends(get_current_user)):
    user_id = payload["userId"]
    type_ = payload["type"]
    message = payload["message"]
    task_id = payload.get("taskId")
    metadata = payload.get("metadata", {})

    supabase.table("notifications").insert({
        "user_id": user_id,
        "task_id": task_id,
        "type": type_,
        "message": message,
        "is_read": False,
        "metadata": metadata,
    }).execute()

    await _send_push(user_id, TITLES.get(type_, "Notification"), message, {"type": type_, "taskId": task_id, **metadata})
    return {"success": True}


@router.post("/notify-push-only")
async def push_only(payload: dict, current_user: dict = Depends(get_current_user)):
    # Push without a notifications row — for cases like extension requests
    # where the request row itself is the record; a notifications row would
    # just be a duplicate.
    user_id = payload["userId"]
    title = payload.get("title", "Notification")
    body = payload.get("body", "")
    data = payload.get("data", {})
    await _send_push(user_id, title, body, data)
    return {"success": True}


@router.delete("/notify-pending")
async def delete_pending_notifications(task_id: str, type: str, current_user: dict = Depends(get_current_user)):
    supabase.table("notifications").delete().eq("task_id", task_id).eq("type", type).execute()
    return {"success": True}

@router.get("/notifications")
async def list_notifications(types: str | None = None, current_user: dict = Depends(get_current_user)):
    user = supabase.table("users").select("id").eq("email", current_user["sub"]).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = user.data[0]["id"]

    query = (
        supabase.table("notifications")
        .select("id, type, message, created_at, metadata, task_id")
        .eq("user_id", own_id)
        .order("created_at", desc=True)
    )
    if types:
        query = query.in_("type", types.split(","))

    result = query.execute()
    return result.data


@router.delete("/notifications")
async def delete_notifications(ids: str, current_user: dict = Depends(get_current_user)):
    user = supabase.table("users").select("id").eq("email", current_user["sub"]).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = user.data[0]["id"]

    id_list = ids.split(",")
    # Scoped to the caller's own user_id — can't delete someone else's notifications
    # even if they somehow guessed another notification's id.
    supabase.table("notifications").delete().eq("user_id", own_id).in_("id", id_list).execute()
    return {"deleted": True}