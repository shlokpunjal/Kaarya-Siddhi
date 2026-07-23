from datetime import datetime, timedelta, timezone
import jwt
from fastapi import APIRouter, Depends, HTTPException

from config import SUPABASE_JWT_SECRET
from supabase_client import supabase
from auth_utils import get_current_user

router = APIRouter()


@router.get("/realtime-token")
async def get_realtime_token(current_user: dict = Depends(get_current_user)):
    user = (
        supabase.table("users")
        .select("id")
        .eq("email", current_user["sub"])
        .execute()
    )
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")

    payload = {
        "sub": user.data[0]["id"],
        "role": "authenticated",
        "aud": "authenticated",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm="HS256")
    return {"token": token}