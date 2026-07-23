# routes/users.py
from fastapi import APIRouter, Depends, HTTPException

from supabase_client import supabase
from auth_utils import get_current_user
from services import delete_user_account
from schemas import DeleteAccountResponse
from schemas import DeleteAccountResponse, UpdateProfileRequest
from services import delete_user_account, normalize_email


router = APIRouter()


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
