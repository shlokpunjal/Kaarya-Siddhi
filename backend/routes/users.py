# routes/users.py
from fastapi import APIRouter, Depends, HTTPException

from supabase_client import supabase
from auth_utils import get_current_user

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