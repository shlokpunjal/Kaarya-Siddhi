from fastapi import APIRouter, Depends, HTTPException
from supabase_client import supabase
from auth_utils import get_current_user
from notify_utils import create_notification, push_only, delete_notifications

router = APIRouter()


@router.post("/notify")
async def create_notification_route(payload: dict, current_user: dict = Depends(get_current_user)):
    user_id = payload.get("userId")
    type_ = payload.get("type")
    message = payload.get("message")
    if not user_id or not type_ or not message:
        raise HTTPException(status_code=400, detail="userId, type and message are required.")

    task_id = payload.get("taskId")
    metadata = payload.get("metadata", {})

    create_notification(user_id, type_, message, task_id=task_id, metadata=metadata)
    return {"success": True}


@router.post("/notify-push-only")
async def push_only_route(payload: dict, current_user: dict = Depends(get_current_user)):
    # Push without a notifications row — for cases like extension requests
    # where the request row itself is the record; a notifications row
    # would just be a duplicate.
    user_id = payload.get("userId")
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required.")

    title = payload.get("title", "Notification")
    body = payload.get("body", "")
    data = payload.get("data", {})
    push_only(user_id, title, body, data=data)
    return {"success": True}


@router.delete("/notify-pending")
async def delete_pending_notifications(task_id: str, type: str, current_user: dict = Depends(get_current_user)):
    delete_notifications(notif_type=type, task_id=task_id)
    return {"success": True}


@router.get("/notifications")
async def list_notifications(types: str | None = None, current_user: dict = Depends(get_current_user)):
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
async def delete_notifications_route(ids: str, current_user: dict = Depends(get_current_user)):
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

    try:
        # Scoped to the caller's own user_id — can't delete someone else's
        # notifications even if they somehow guessed another notification's id.
        supabase.table("notifications").delete().eq("user_id", own_id).in_("id", id_list).execute()
    except Exception:
        raise HTTPException(status_code=503, detail="Could not clear notifications right now.")

    return {"deleted": True}
