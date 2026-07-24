# routes/users.py
from fastapi import APIRouter, Depends, HTTPException

from supabase_client import supabase
from auth_utils import get_current_user
from services import delete_user_account
from schemas import DeleteAccountResponse
from fastapi import Body
from schemas import DeleteAccountResponse, UpdateProfileRequest
from services import delete_user_account, normalize_email
router = APIRouter()


ALLOWED_PROFILE_FIELDS = {
    "name",
    "mobile_number",
    "department",
    "designation",
    "profile_pic_url",
    "notifications_enabled",
    "is_profile_setup",
    "email",
    "language",
    "theme",
    "date_of_birth",
}


@router.patch("/profile")
async def update_profile(
    updates: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    # Whitelist — never let the client set role, id, or workspace_id
    # through this endpoint, no matter what the request body contains.
    safe_updates = {k: v for k, v in updates.items() if k in ALLOWED_PROFILE_FIELDS}

    if not safe_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    result = (
        supabase.table("users")
        .update(safe_updates)
        .eq("email", current_user["sub"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found.")

    return result.data[0]

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = (
        supabase.table("users")
        .select("*")
        .eq("email", current_user["sub"])
        .execute()
    )

    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")

    return user.data[0]

@router.patch("/me")
async def update_me(
    data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    updates = {}
    if data.name is not None:
        updates["name"] = data.name.strip()
    if data.mobile_number is not None:
        updates["mobile_number"] = data.mobile_number.strip()
    if data.email is not None:
        new_email = normalize_email(data.email)
        if new_email != current_user["sub"]:
            existing = supabase.table("users").select("id").eq("email", new_email).execute()
            if existing.data:
                raise HTTPException(status_code=400, detail="That email is already in use.")
        updates["email"] = new_email

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")

    supabase.table("users").update(updates).eq("email", current_user["sub"]).execute()

    lookup_email = updates.get("email", current_user["sub"])
    user = supabase.table("users").select("*").eq("email", lookup_email).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="Account not found after update.")

    return user.data[0]


@router.delete("/delete-account", response_model=DeleteAccountResponse)
async def delete_account(current_user: dict = Depends(get_current_user)):
    user = (
        supabase.table("users")
        .select("*")
        .eq("email", current_user["sub"])
        .execute()
    )

    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")

    user_row = user.data[0]

    delete_user_account(
        supabase=supabase,
        user_id=user_row["id"],
        email=user_row["email"],
        role=user_row.get("role"),
    )
    return DeleteAccountResponse(success=True, message="Account deleted successfully")


@router.get("/connection-status")
async def get_connection_status(current_user: dict = Depends(get_current_user)):
    email = current_user["sub"]

    conn = (
        supabase.table("connections")
        .select("admin_email, status")
        .eq("employee_email", email)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not conn.data:
        return {"status": "none"}

    latest = conn.data[0]

    if latest["status"] == "accepted":
        admin = (
            supabase.table("users")
            .select("name")
            .eq("email", latest["admin_email"])
            .execute()
        )
        admin_name = admin.data[0]["name"] if admin.data else latest["admin_email"]
        return {"status": "accepted", "admin_name": admin_name}

    if latest["status"] == "pending":
        return {"status": "pending"}

    return {"status": "none"}


@router.get("/team")
async def get_team(current_user: dict = Depends(get_current_user)):
    email = current_user["sub"]

    connections = (
        supabase.table("connections")
        .select("employee_email")
        .eq("admin_email", email)
        .eq("status", "accepted")
        .execute()
    )

    employee_emails = [c["employee_email"] for c in connections.data or []]

    if not employee_emails:
        return []

    users = (
        supabase.table("users")
        .select("email, name")
        .in_("email", employee_emails)
        .execute()
    )

    users_by_email = {u["email"]: u["name"] for u in users.data or []}

    return [
        {"email": e, "name": users_by_email.get(e, e)}
        for e in employee_emails
    ]
    
    
@router.get("/find-admin")
async def find_admin(email: str, current_user: dict = Depends(get_current_user)):
    result = (
        supabase.table("users")
        .select("email, role")
        .eq("email", email)
        .eq("role", "admin")
        .execute()
    )
    return {"found": bool(result.data)}