# routes/connections.py
import uuid

from fastapi import APIRouter, Depends, HTTPException

from supabase_client import supabase
from auth_utils import get_current_user
from services import normalize_email
from notify_utils import create_notification, delete_notifications
from schemas import ConnectRequest, ConnectionRespond, DisconnectAdminRequest
from fastapi import HTTPException

router = APIRouter()


@router.post("/connect-request")
async def connect_request(data: ConnectRequest, current_user: dict = Depends(get_current_user)):
    employee_email = normalize_email(data.employee_email)
    admin_email = normalize_email(data.admin_email)

    # Only the employee themselves can send a connection request as that
    # employee — otherwise any logged-in account could spam requests
    # from/to arbitrary emails it doesn't own.
    if current_user.get("sub") != employee_email or current_user.get("role") != "employee":
        raise HTTPException(status_code=403, detail="You can only send a connection request as yourself.")

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
    create_notification(
        admin_row["id"],
        "connection_request",
        f"{employee_email} wants to connect with you.",
        metadata={"employee_email": employee_email, "admin_email": admin_email},
    )

    # Notify the employee: request sent, pending (no push — this is just a
    # self-confirmation the employee sees on their own notifications screen).
    employee_row = employee
    create_notification(
        employee_row["id"],
        "connection_pending",
        f"Your connection request to {admin_email} is pending.",
        metadata={"employee_email": employee_email, "admin_email": admin_email},
        send_push=False,
    )

    return {"success": True, "message": "Connection request sent."}


@router.get("/connection-status/{employee_email}/{admin_email}")
async def connection_status(
    employee_email: str,
    admin_email: str,
    current_user: dict = Depends(get_current_user),
):
    employee_email = normalize_email(employee_email)
    admin_email = normalize_email(admin_email)

    # Either party to the connection can check its status — nobody else.
    caller = current_user.get("sub")
    if caller not in (employee_email, admin_email):
        raise HTTPException(status_code=403, detail="You can only check your own connections.")

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

    # Only the admin who owns this inbox can see their pending requests.
    if current_user.get("sub") != admin_email or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You can only view your own pending requests.")

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

    # Only the admin the request was sent to can accept/reject it.
    if current_user.get("sub") != admin_email or current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You can only respond to your own connection requests.")

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

    # Clean up the pending notifications for both parties regardless of outcome.
    # Best-effort: a failed cleanup here must not stop the accept/reject
    # itself from going through.
    for notif_type in ("connection_request", "connection_pending"):
        delete_notifications(
            notif_type=notif_type,
            metadata_match={"employee_email": employee_email, "admin_email": admin_email},
        )

    if not data.accept:
        rejected_employee = (
            supabase.table("users")
            .select("*")
            .eq("email", employee_email)
            .execute()
        )
        if rejected_employee.data:
            emp_row = rejected_employee.data[0]
            create_notification(
                emp_row["id"],
                "connection_rejected",
                f"{admin_email} has declined your connection request.",
                metadata={"employee_email": employee_email, "admin_email": admin_email},
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

    create_notification(
        employee["id"],
        "connection_accepted",
        f"{admin_email} has accepted your connection request.",
        metadata={"employee_email": employee_email, "admin_email": admin_email},
    )

    return {"success": True, "message": "Employee Connected Successfully", "workspace_id": workspace_id}


@router.get("/employee/connection-status/{employee_email}")
async def employee_connection_status(employee_email: str, current_user: dict = Depends(get_current_user)):
    employee_email = normalize_email(employee_email)

    if current_user.get("sub") != employee_email:
        raise HTTPException(status_code=403, detail="You can only check your own connection status.")

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


@router.get("/connection-requests")
async def get_connection_requests(current_user: dict = Depends(get_current_user)):
    admin = supabase.table("users").select("id").eq("email", current_user["sub"]).execute()
    if not admin.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    admin_id = admin.data[0]["id"]

    rows = (
        supabase.table("notifications")
        .select("id, created_at, metadata")
        .eq("user_id", admin_id)
        .eq("type", "connection_request")
        .order("created_at", desc=True)
        .execute()
    ).data or []

    emails = [r["metadata"].get("employee_email") for r in rows if r.get("metadata")]
    emails = [e for e in emails if e]

    names_by_email = {}
    if emails:
        users = supabase.table("users").select("email, name").in_("email", emails).execute()
        names_by_email = {u["email"]: u["name"] for u in users.data or []}

    return [
        {**r, "employee_name": names_by_email.get((r.get("metadata") or {}).get("employee_email"))}
        for r in rows
    ]
