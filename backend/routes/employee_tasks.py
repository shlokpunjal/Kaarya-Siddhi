from fastapi import APIRouter, Depends, HTTPException
from supabase_client import supabase
from auth_utils import get_current_user

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