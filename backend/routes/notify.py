from fastapi import APIRouter, Depends
from supabase_client import supabase
from auth_utils import get_current_user
import httpx

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


@router.delete("/notify-pending")
async def delete_pending_notifications(task_id: str, type: str, current_user: dict = Depends(get_current_user)):
    supabase.table("notifications").delete().eq("task_id", task_id).eq("type", type).execute()
    return {"success": True}