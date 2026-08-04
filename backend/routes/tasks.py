from fastapi import APIRouter, Depends, HTTPException

from supabase_client import supabase
from auth_utils import get_current_user

router = APIRouter()

from fastapi import Query

@router.get("/tasks")
async def get_tasks(
    employee_email: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
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
        query = query.eq("assigned_to", user_row["id"])

    elif role == "admin":
        if employee_email:
            employee = (
                supabase.table("users")
                .select("id, workspace_id")
                .eq("email", employee_email)
                .execute()
            )
            if not employee.data or employee.data[0]["workspace_id"] != user_row.get("workspace_id"):
                raise HTTPException(status_code=404, detail="Employee not found in your workspace.")
            query = query.eq("assigned_to", employee.data[0]["id"]).eq("workspace_id", user_row["workspace_id"])
        else:
            query = query.eq("created_by", user_row["id"]).eq("workspace_id", user_row["workspace_id"])

    else:
        raise HTTPException(status_code=403, detail="Unrecognized role.")

    result = query.order("created_at", desc=True).execute()
    return result.data

# Keep this in sync with the `types=` list each notifications screen
# fetches (app/notifications/employee.tsx and app/notifications/admin.tsx).
# This used to omit "deadline", "overdue", "eoffice_pending" and
# "task_suggestion" — so a deadline/overdue/eoffice reminder would show
# up in the notifications list (correct) but never light up the bell
# badge on the dashboard (bug), because the badge count query filtered
# them out here.
DECIDED_NOTIFICATION_TYPES = [
    "connection_accepted",
    "connection_rejected",
    "extension_accepted",
    "extension_rejected",
    "task_assigned",
    "task_in_review",
    "task_suggestion",
    "deadline",
    "overdue",
    "eoffice_pending",
]

# Admin's dashboard bell also needs to reflect the "other" notifications
# shown on app/notifications/admin.tsx (task submitted for review, task
# overdue, eoffice files pending) in addition to connection requests and
# pending extension requests. Keep in sync with the `types=` list in
# fetchOtherNotifications() there.
ADMIN_OTHER_NOTIFICATION_TYPES = ["task_in_review", "overdue", "eoffice_pending"]



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
        # NOTE: workspace_id is only assigned once the admin accepts their
        # FIRST employee (see connection_respond in routes/connections.py) —
        # so a brand-new admin with a pending connection_request sitting in
        # their inbox has no workspace_id yet. Pending connection requests
        # are keyed off the admin's own user_id, not workspace_id, so they
        # must always be counted regardless. Only the extension_requests
        # lookup is workspace-scoped, and that's the only piece that needs
        # to be skipped for a workspace-less admin.
        #
        # FIX: this used to also add ADMIN_OTHER_NOTIFICATION_TYPES
        # (task_in_review / overdue / eoffice_pending) into this total.
        # Those are the separate "Other Notifications" feed shown further
        # down the same screen — not requests — and they're NOT one-time:
        # eoffice_pending is re-inserted every day with no dedupe by
        # design (see database/reminders_pg_cron.sql), and overdue adds a
        # fresh row per task per day it stays overdue. That made this
        # "X pending" badge — which the UI explicitly labels as being
        # about "Connection & extend deadline requests" — climb
        # indefinitely and no longer reflect actual pending decisions.
        # This endpoint is only consumed by the Requests card
        # (app/notifications/admin.tsx), so it's safe to scope it to
        # exactly what that card is about.
        conn_result = (
            supabase.table("notifications")
            .select("id", count="exact")
            .eq("user_id", user_row["id"])
            .eq("type", "connection_request")
            .execute()
        )
 
        ext_count = 0
        if user_row.get("workspace_id"):
            ext_result = (
                supabase.table("extension_requests")
                .select("id", count="exact")
                .eq("workspace_id", user_row["workspace_id"])
                .eq("status", "pending")
                .execute()
            )
            ext_count = ext_result.count or 0
 
        return {
            "count": (conn_result.count or 0) + ext_count
        }
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
        if not user_row.get("workspace_id"):
            return []
        query = query.or_(
            f"assigned_to.eq.{user_row['id']},created_by.eq.{user_row['id']}"
        ).eq("workspace_id", user_row["workspace_id"])
    elif role == "admin":
        if not user_row.get("workspace_id"):
            return []
        query = query.eq("workspace_id", user_row["workspace_id"])
    else:
        raise HTTPException(status_code=403, detail="Unrecognized role.")

    result = query.execute()
    return result.data

@router.get("/admin-tasks-and-team")
async def get_admin_tasks_and_team(current_user: dict = Depends(get_current_user)):
    email = current_user["sub"]

    admin = supabase.table("users").select("id, workspace_id").eq("email", email).execute()
    if not admin.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    admin_id = admin.data[0]["id"]
    admin_workspace_id = admin.data[0].get("workspace_id")

    tasks_result = (
        supabase.table("tasks")
        .select("*")
        .eq("created_by", admin_id)
        .eq("workspace_id", admin_workspace_id)
        .order("deadline", desc=False)
        .execute()
    )
    task_rows = tasks_result.data or []

    connections = (
        supabase.table("connections")
        .select("employee_email")
        .eq("admin_email", email)
        .eq("status", "accepted")
        .execute()
    )
    employee_emails = [c["employee_email"] for c in connections.data or []]

    employees_by_id = {}

    if employee_emails:
        team_users = (
            supabase.table("users")
            .select("id, name, email")
            .in_("email", employee_emails)
            .execute()
        )
        for u in team_users.data or []:
            employees_by_id[u["id"]] = u

    assigned_ids = {t["assigned_to"] for t in task_rows if t.get("assigned_to")}
    missing_ids = [i for i in assigned_ids if i not in employees_by_id]

    if missing_ids:
        extra_users = (
            supabase.table("users")
            .select("id, name, email")
            .in_("id", missing_ids)
            .execute()
        )
        for u in extra_users.data or []:
            employees_by_id[u["id"]] = u

    return {
        "tasks": task_rows,
        "employees": list(employees_by_id.values()),
    }
    
@router.get("/extension-requests-list")
async def get_extension_requests_list(current_user: dict = Depends(get_current_user)):
    admin = supabase.table("users").select("workspace_id").eq("email", current_user["sub"]).execute()
    if not admin.data or not admin.data[0].get("workspace_id"):
        return []

    result = (
        supabase.table("extension_requests")
        .select("id, task_id, reason, requested_deadline, created_at, tasks(title, priority)")
        .eq("workspace_id", admin.data[0]["workspace_id"])
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data