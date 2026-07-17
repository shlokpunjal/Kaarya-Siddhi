# routes/connections.py
import uuid

from fastapi import APIRouter, Depends, HTTPException

from supabase_client import supabase
from auth_utils import get_current_user
from services import normalize_email, send_push_notification
from schemas import ConnectRequest, ConnectionRespond, DisconnectAdminRequest

router = APIRouter()


@router.post("/connect-request")
async def connect_request(data: ConnectRequest, current_user: dict = Depends(get_current_user)):
    employee_email = normalize_email(data.employee_email)
    admin_email = normalize_email(data.admin_email)

    # Employee must exist
    employee = (
        supabase.table("users")
        .select("*")
        .eq("email", employee_email)
        .eq("role", "employee")
        .execute()
    )

    if not employee.data:
        raise HTTPException(status_code=404, detail="Employee account not found.")

    # Admin must exist
    admin = (
        supabase.table("users")
        .select("*")
        .eq("email", admin_email)
        .eq("role", "admin")
        .execute()
    )
    if not admin.data:
        raise HTTPException(status_code=404, detail="Admin account not found.")

    employee = employee.data[0]

    # Already connected?
    if employee.get("workspace_id"):
        workspace = (
            supabase.table("workspaces")
            .select("*")
            .eq("id", employee["workspace_id"])
            .execute()
        )

        if workspace.data:
            owner = workspace.data[0]["owner_email"]
            if owner == admin_email:
                raise HTTPException(status_code=400, detail="Already connected to this admin.")

    # Pending request already?
    existing_row = (
        supabase.table("connections")
        .select("*")
        .eq("employee_email", employee_email)
        .eq("admin_email", admin_email)
        .execute()
    )

    if existing_row.data:
        supabase.table("connections").update({
            "status": "pending"
        }).eq("employee_email", employee_email).eq("admin_email", admin_email).execute()
    else:
        supabase.table("connections").insert({
            "id": str(uuid.uuid4()),
            "employee_email": employee_email,
            "admin_email": admin_email,
            "status": "pending"
        }).execute()

    # Notify the admin: new connection request
    admin_row = admin.data[0]
    supabase.table("notifications").insert({
        "user_id": admin_row["id"],
        "task_id": None,
        "type": "connection_request",
        "message": f"{employee_email} wants to connect with you.",
        "is_read": False,
        "metadata": {"employee_email": employee_email, "admin_email": admin_email},
    }).execute()

    send_push_notification(
        admin_row.get("expo_push_token"),
        "New Connection Request",
        f"{employee_email} wants to connect with you.",
        data={"type": "connection_request", "employee_email": employee_email, "admin_email": admin_email},
    )

    # Notify the employee: request sent, pending
    employee_row = employee
    supabase.table("notifications").insert({
        "user_id": employee_row["id"],
        "task_id": None,
        "type": "connection_pending",
        "message": f"Your connection request to {admin_email} is pending.",
        "is_read": False,
        "metadata": {"employee_email": employee_email, "admin_email": admin_email},
    }).execute()

    return {"success": True, "message": "Connection request sent."}


@router.get("/connection-status/{employee_email}/{admin_email}")
async def connection_status(employee_email: str, admin_email: str):
    employee_email = normalize_email(employee_email)
    admin_email = normalize_email(admin_email)

    request = (
        supabase.table("connections")
        .select("*")
        .eq("employee_email", employee_email)
        .eq("admin_email", admin_email)
        .execute()
    )

    if not request.data:
        return {"status": "not_found"}

    return {"status": request.data[0]["status"]}


@router.get("/admin/pending/{admin_email}")
async def pending_requests(admin_email: str, current_user: dict = Depends(get_current_user)):
    admin_email = normalize_email(admin_email)

    requests = (
        supabase.table("connections")
        .select("*")
        .eq("admin_email", admin_email)
        .eq("status", "pending")
        .execute()
    )

    return {"success": True, "requests": requests.data}


@router.post("/connection-respond")
async def connection_respond(data: ConnectionRespond, current_user: dict = Depends(get_current_user)):
    employee_email = normalize_email(data.employee_email)
    admin_email = normalize_email(data.admin_email)
    new_status = "accepted" if data.accept else "rejected"

    connection = (
        supabase.table("connections")
        .select("*")
        .eq("employee_email", employee_email)
        .eq("admin_email", admin_email)
        .execute()
    )

    if not connection.data:
        raise HTTPException(status_code=404, detail="Connection request not found.")

    supabase.table("connections").update({
        "status": new_status
    }).eq("employee_email", employee_email).eq("admin_email", admin_email).execute()

    # Clean up the pending notifications for both parties regardless of outcome
    supabase.table("notifications").delete() \
        .in_("type", ["connection_request", "connection_pending"]) \
        .contains("metadata", {"employee_email": employee_email, "admin_email": admin_email}) \
        .execute()

    if not data.accept:
        rejected_employee = (
            supabase.table("users")
            .select("*")
            .eq("email", employee_email)
            .execute()
        )
        if rejected_employee.data:
            emp_row = rejected_employee.data[0]
            supabase.table("notifications").insert({
                "user_id": emp_row["id"],
                "task_id": None,
                "type": "connection_rejected",
                "message": f"{admin_email} has declined your connection request.",
                "is_read": False,
                "metadata": {"employee_email": employee_email, "admin_email": admin_email},
            }).execute()
            token = emp_row.get("expo_push_token")
            send_push_notification(
                token,
                "Request Rejected",
                f"{admin_email} has declined your connection request.",
                data={"type": "connection_rejected", "employee_email": employee_email, "admin_email": admin_email},
            )

        return {"success": True, "message": "Request Rejected"}

    admin = (
        supabase.table("users")
        .select("*")
        .eq("email", admin_email)
        .execute()
    )
    admin = admin.data[0]

    workspace_id = admin.get("workspace_id")
    if not workspace_id:
        workspace = (
            supabase.table("workspaces")
            .insert({"name": f"{admin_email}'s Workspace", "owner_email": admin_email})
            .execute()
        )
        workspace_id = workspace.data[0]["id"]
        supabase.table("users").update({"workspace_id": workspace_id}).eq("email", admin_email).execute()

    employee = (
        supabase.table("users")
        .select("*")
        .eq("email", employee_email)
        .execute()
    )
    employee = employee.data[0]

    supabase.table("users").update({"workspace_id": workspace_id}).eq("email", employee_email).execute()

    supabase.table("notifications").insert({
        "user_id": employee["id"],
        "task_id": None,
        "type": "connection_accepted",
        "message": f"{admin_email} has accepted your connection request.",
        "is_read": False,
        "metadata": {"employee_email": employee_email, "admin_email": admin_email},
    }).execute()

    employee_token = employee.get("expo_push_token")
    send_push_notification(
        employee_token,
        "Request Accepted",
        f"{admin_email} has accepted your connection request.",
        data={"type": "connection_accepted", "employee_email": employee_email, "admin_email": admin_email},
    )

    return {"success": True, "message": "Employee Connected Successfully", "workspace_id": workspace_id}


@router.get("/employee/connection-status/{employee_email}")
async def employee_connection_status(employee_email: str, current_user: dict = Depends(get_current_user)):
    employee_email = normalize_email(employee_email)

    request = (
        supabase.table("connections")
        .select("*")
        .eq("employee_email", employee_email)
        .order("id", desc=True)
        .limit(1)
        .execute()
    )

    if not request.data:
        return {"status": "not_found"}

    return {
        "status": request.data[0]["status"],
        "admin_email": request.data[0]["admin_email"]
    }


@router.post("/employee/disconnect-admin")
async def disconnect_admin(data: DisconnectAdminRequest, current_user: dict = Depends(get_current_user)):
    employee_email = normalize_email(data.employee_email)

    if current_user.get("sub") != employee_email:
        raise HTTPException(status_code=403, detail="You can only disconnect your own account.")

    employee = (
        supabase.table("users")
        .select("*")
        .eq("email", employee_email)
        .eq("role", "employee")
        .execute()
    )

    if not employee.data:
        raise HTTPException(status_code=404, detail="Employee account not found.")

    employee_row = employee.data[0]

    if not employee_row.get("workspace_id"):
        raise HTTPException(status_code=400, detail="You are not currently connected to any admin.")

    supabase.table("users").update({"workspace_id": None}).eq("email", employee_email).execute()
    supabase.table("connections").delete().eq("employee_email", employee_email).execute()

    return {"success": True, "message": "Disconnected from admin successfully."}