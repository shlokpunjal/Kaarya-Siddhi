# routes/tasks.py
from fastapi import APIRouter, Depends, HTTPException

from supabase_client import supabase
from auth_utils import get_current_user

router = APIRouter()


@router.get("/tasks")
async def get_tasks(current_user: dict = Depends(get_current_user)):
    email = current_user["sub"]
    role = current_user["role"]
    workspace_id = current_user.get("workspace_id")

    # Resolve the caller's internal user id — needed for the employee
    # filter below, and confirms the account still exists.
    user = (
        supabase.table("users")
        .select("id, workspace_id")
        .eq("email", email)
        .execute()
    )
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")

    user_row = user.data[0]

    query = supabase.table("tasks").select("*")

    if role == "employee":
        # Employees see only tasks assigned to them.
        query = query.eq("assigned_to", email)
    elif role == "admin":
        # Admins see every task in their workspace.
        effective_workspace_id = workspace_id or user_row.get("workspace_id")
        if not effective_workspace_id:
            raise HTTPException(status_code=403, detail="No workspace associated with this account.")
        query = query.eq("workspace_id", effective_workspace_id)
    else:
        raise HTTPException(status_code=403, detail="Unrecognized role.")

    result = query.order("created_at", desc=True).execute()
    return result.data

DECIDED_NOTIFICATION_TYPES = [
    "connection_accepted",
    "connection_rejected",
    "extension_accepted",
    "extension_rejected",
    "task_assigned",
    "task_in_review",
]


@router.get("/dashboard-counts")
async def get_dashboard_counts(current_user: dict = Depends(get_current_user)):
    email = current_user["sub"]
    role = current_user["role"]

    user = (
        supabase.table("users")
        .select("id, workspace_id")
        .eq("email", email)
        .execute()
    )
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")

    user_row = user.data[0]

    if role == "employee":
        result = (
            supabase.table("notifications")
            .select("id", count="exact")
            .eq("user_id", user_row["id"])
            .in_("type", DECIDED_NOTIFICATION_TYPES)
            .execute()
        )
        return {"count": result.count or 0}

    elif role == "admin":
        if not user_row.get("workspace_id"):
            return {"count": 0}

        conn_result = (
            supabase.table("notifications")
            .select("id", count="exact")
            .eq("user_id", user_row["id"])
            .eq("type", "connection_request")
            .execute()
        )
        ext_result = (
            supabase.table("extension_requests")
            .select("id", count="exact")
            .eq("workspace_id", user_row["workspace_id"])
            .eq("status", "pending")
            .execute()
        )
        return {"count": (conn_result.count or 0) + (ext_result.count or 0)}

    else:
        raise HTTPException(status_code=403, detail="Unrecognized role.")
    
    
    
@router.get("/calendar-tasks")
async def get_calendar_tasks(current_user: dict = Depends(get_current_user)):
    email = current_user["sub"]
    role = current_user["role"]

    user = (
        supabase.table("users")
        .select("id, workspace_id")
        .eq("email", email)
        .execute()
    )
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")

    user_row = user.data[0]
    query = supabase.table("tasks").select("*")

    if role == "employee":
        query = query.or_(f"assigned_to.eq.{user_row['id']},created_by.eq.{user_row['id']}")
    elif role == "admin":
        if not user_row.get("workspace_id"):
            return []
        query = query.eq("workspace_id", user_row["workspace_id"])
    else:
        raise HTTPException(status_code=403, detail="Unrecognized role.")

    result = query.execute()
    return result.data