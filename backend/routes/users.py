# routes/users.py
from fastapi import APIRouter, Depends, HTTPException

from supabase_client import supabase
from auth_utils import get_current_user
from services import delete_user_account
from schemas import DeleteAccountResponse

router = APIRouter()

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