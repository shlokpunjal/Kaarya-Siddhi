from fastapi import APIRouter, Depends, HTTPException

from supabase_client import supabase
from auth_utils import get_current_user
from services import delete_user_account
from schemas import DeleteAccountResponse
from fastapi import Body
from schemas import DeleteAccountResponse
from services import delete_user_account
from cloudinary_utils import delete_cloudinary_asset
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

    # If the avatar is being replaced, grab the CURRENT url first --
    # once .update() below runs, it's gone from the row and there's no
    # way to know what to clean up on Cloudinary afterward.
    old_avatar_url = None
    if "profile_pic_url" in safe_updates:
        existing = (
            supabase.table("users")
            .select("profile_pic_url")
            .eq("email", current_user["sub"])
            .execute()
        )
        if existing.data:
            old_avatar_url = existing.data[0].get("profile_pic_url")

    result = (
        supabase.table("users")
        .update(safe_updates)
        .eq("email", current_user["sub"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found.")

    new_avatar_url = safe_updates.get("profile_pic_url")
    if old_avatar_url and old_avatar_url != new_avatar_url:
        # Best-effort, after the DB row is already updated -- a failure
        # here must never block the profile update response.
        delete_cloudinary_asset(old_avatar_url, "image/jpeg")

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
        .select("email, name, designation, profile_pic_url")
        .in_("email", employee_emails)
        .execute()
    )

    users_by_email = {u["email"]: u for u in users.data or []}

    return [
        {
            "email": e,
            "name": users_by_email.get(e, {}).get("name", e),
            "designation": users_by_email.get(e, {}).get("designation"),
            "profile_pic_url": users_by_email.get(e, {}).get("profile_pic_url"),
        }
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