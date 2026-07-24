from fastapi import APIRouter, Depends, HTTPException
from supabase_client import supabase
from auth_utils import get_current_user
from routes.notify import _send_push

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
            "attachment_url": payload.get("attachment_url"),
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

    allowed = {"title", "deadline", "description", "attachment_url", "priority"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

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
            "attachment_url": payload.get("attachment_url"),
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
        rows = [
            {"user_id": uid, "type": "task_in_review", "message": f'"{task["title"]}" has been submitted for review.', "task_id": task_id}
            for uid in recipients
        ]
        supabase.table("notifications").insert(rows).execute()

        for uid in recipients:
            if uid != own_id:
                await _send_push(uid, "Task submitted for review", f'"{task["title"]}" has been submitted for review.', {"type": "task_in_review", "taskId": task_id})

    return {"status": "in_review"}