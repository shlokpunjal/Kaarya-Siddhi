from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from supabase_client import supabase
from auth_utils import get_current_user
from routes.notify import _send_push

router = APIRouter()


@router.get("/extension-requests/{request_id}")
async def get_extension_request(request_id: str, current_user: dict = Depends(get_current_user)):
    req = supabase.table("extension_requests").select("*").eq("id", request_id).execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found.")
    row = req.data[0]

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
async def decide_extension_request(request_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    decision = payload.get("decision")
    if decision not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid decision.")

    note = payload.get("admin_note")
    decided_at = datetime.now(timezone.utc).isoformat()

    req = supabase.table("extension_requests").select("*").eq("id", request_id).execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found.")
    row = req.data[0]

    supabase.table("extension_requests").update({
        "status": decision, "admin_note": note, "decided_at": decided_at
    }).eq("id", request_id).execute()

    if decision == "accepted" and row.get("task_id"):
        supabase.table("tasks").update({
            "deadline": row["requested_deadline"], "deadline_reminder_sent": False
        }).eq("id", row["task_id"]).execute()

    supabase.table("notifications").delete().eq("type", "extension_request").contains(
        "metadata", {"extension_request_id": request_id}
    ).execute()

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
        supabase.table("notifications").insert({
            "user_id": row["requested_by"],
            "task_id": row.get("task_id"),
            "type": notif_type,
            "message": message,
            "is_read": False,
            "metadata": {"extension_request_id": request_id},
        }).execute()
        await _send_push(row["requested_by"], f"Extension {decision.capitalize()}", message, {"type": notif_type, "taskId": row.get("task_id")})

    return {"status": decision, "admin_note": note, "decided_at": decided_at}