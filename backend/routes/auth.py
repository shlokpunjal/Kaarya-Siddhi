import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from supabase_client import supabase
from auth_utils import get_current_user, create_access_token, create_refresh_token, hash_token
from services import normalize_email, send_email_otp
from schemas import (
    SignupRequest, LoginRequest, SendOTPRequest, VerifyOTPRequest,
    SavePushTokenRequest, CheckNameRequest, RefreshRequest, LogoutRequest,
)
from config import (
    MAX_VERIFY_ATTEMPTS, OTP_EXPIRY_MINUTES, OTP_RESEND_SECONDS, MAX_DAILY_ATTEMPTS,
    AUTH_RATE_LIMIT, LOOKUP_RATE_LIMIT,
)
from rate_limit import limiter

router = APIRouter()


def _generate_otp() -> str:
    # secrets, not random — random.randint is not cryptographically
    # secure and there's no reason to accept that risk for a 6-digit
    # code that gates account access.
    return str(secrets.randbelow(900000) + 100000)


@router.post("/save-push-token")
async def save_push_token(data: SavePushTokenRequest, user: dict = Depends(get_current_user)):
    email = user.get("sub")
    supabase.table("users").update({"expo_push_token": data.push_token}).eq("email", email).execute()
    return {"success": True}


@router.post("/check-name")
@limiter.limit(LOOKUP_RATE_LIMIT)
async def check_name(request: Request, data: CheckNameRequest):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")

    existing = (
        supabase.table("users").select("id").ilike("name", name).eq("role", data.role).execute()
    )
    return {"available": len(existing.data) == 0}


@router.post("/signup")
@limiter.limit(AUTH_RATE_LIMIT)
async def signup(request: Request, data: SignupRequest):
    data.email = normalize_email(data.email)
    data.name = data.name.strip()

    existing = supabase.table("users").select("*").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Account already exists.")

    name_check = (
        supabase.table("users").select("id").ilike("name", data.name).eq("role", data.role).execute()
    )
    if name_check.data:
        raise HTTPException(status_code=409, detail="This name is already taken.")

    pending_data = {
        "name": data.name,
        "phone": data.phone,
        "role": data.role,
        "department": data.department,
    }

    supabase.table("otp_sessions").upsert({
        "email": data.email,
        "otp": "",
        "role": data.role,
        "pending_signup": pending_data,
    }).execute()

    return {"success": True, "message": "Signup staged. Please verify OTP."}


@router.post("/login")
@limiter.limit(AUTH_RATE_LIMIT)
async def login(request: Request, data: LoginRequest):
    data.email = normalize_email(data.email)

    user = (
        supabase.table("users")
        .select("*")
        .eq("email", data.email)
        .eq("mobile_number", data.phone)
        .eq("role", data.role)
        .execute()
    )

    if not user.data:
        raise HTTPException(status_code=404, detail="Account doesn't exist.")

    return {"success": True, "message": "Account Found"}


@router.post("/send-otp")
@limiter.limit(AUTH_RATE_LIMIT)
async def send_otp(request: Request, data: SendOTPRequest):
    data.email = normalize_email(data.email)

    user = (
        supabase.table("users").select("*").eq("email", data.email).eq("role", data.role).execute()
    )
    session = supabase.table("otp_sessions").select("*").eq("email", data.email).execute()
    session_row = session.data[0] if session.data else None

    if not user.data and not (session_row and session_row.get("pending_signup")):
        raise HTTPException(status_code=404, detail="Account doesn't exist. Please signup.")

    now = datetime.now(timezone.utc)

    first_attempt = (
        datetime.fromisoformat(session_row["first_attempt_at"])
        if session_row and session_row.get("first_attempt_at") else None
    )
    last_sent = (
        datetime.fromisoformat(session_row["last_sent_at"])
        if session_row and session_row.get("last_sent_at") else None
    )
    daily_count = session_row["daily_count"] if session_row else 0

    if first_attempt and now - first_attempt > timedelta(hours=24):
        daily_count = 0
        first_attempt = None

    if daily_count >= MAX_DAILY_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Daily OTP limit reached.")

    if last_sent and now - last_sent < timedelta(seconds=OTP_RESEND_SECONDS):
        wait = OTP_RESEND_SECONDS - int((now - last_sent).total_seconds())
        raise HTTPException(status_code=429, detail=f"Please wait {wait} seconds.")

    otp = _generate_otp()

    try:
        send_email_otp(data.email, otp)
    except Exception as e:
        print(f"OTP email failed for {data.email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please check your email address and try again.")

    if daily_count == 0:
        first_attempt = now

    supabase.table("otp_sessions").upsert({
        "email": data.email,
        "otp": otp,
        "role": data.role,
        "created_at": now.isoformat(),
        "verify_attempts": 0,
        "daily_count": daily_count + 1,
        "first_attempt_at": first_attempt.isoformat() if first_attempt else None,
        "last_sent_at": now.isoformat(),
        "pending_signup": session_row.get("pending_signup") if session_row else None,
    }).execute()

    return {"success": True, "message": "OTP Sent Successfully"}


@router.post("/verify-otp")
@limiter.limit(AUTH_RATE_LIMIT)
async def verify_otp(request: Request, data: VerifyOTPRequest):
    data.email = normalize_email(data.email)

    session = supabase.table("otp_sessions").select("*").eq("email", data.email).execute()
    if not session.data:
        raise HTTPException(status_code=400, detail="OTP expired.")

    session_row = session.data[0]
    created = datetime.fromisoformat(session_row["created_at"])

    if datetime.now(timezone.utc) - created > timedelta(minutes=OTP_EXPIRY_MINUTES):
        supabase.table("otp_sessions").delete().eq("email", data.email).execute()
        raise HTTPException(status_code=400, detail="OTP expired.")

    if session_row["verify_attempts"] >= MAX_VERIFY_ATTEMPTS:
        supabase.table("otp_sessions").delete().eq("email", data.email).execute()
        raise HTTPException(status_code=429, detail="Too many incorrect attempts. Please request a new OTP.")

    if session_row["otp"] != data.otp:
        new_attempts = session_row["verify_attempts"] + 1
        supabase.table("otp_sessions").update({"verify_attempts": new_attempts}).eq("email", data.email).execute()
        remaining = MAX_VERIFY_ATTEMPTS - new_attempts
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempt(s) remaining.")

    pending = session_row.get("pending_signup")

    if pending:
        name_recheck = (
            supabase.table("users").select("id").ilike("name", pending["name"]).eq("role", pending["role"]).execute()
        )
        if name_recheck.data:
            supabase.table("otp_sessions").delete().eq("email", data.email).execute()
            raise HTTPException(status_code=409, detail="This name was just taken by someone else. Please go back and choose a different name.")

        supabase.table("users").insert({
            "name": pending["name"],
            "email": data.email,
            "mobile_number": pending["phone"],
            "role": pending["role"],
            "department": pending["department"],
            "is_profile_setup": False,
        }).execute()

        if pending["role"] == "admin":
            workspace = (
                supabase.table("workspaces")
                .insert({"name": f"{pending['name']}'s Workspace", "owner_email": data.email})
                .execute()
            )
            workspace_id = workspace.data[0]["id"]
            supabase.table("users").update({"workspace_id": workspace_id}).eq("email", data.email).execute()

    supabase.table("otp_sessions").delete().eq("email", data.email).execute()

    user = supabase.table("users").select("*").eq("email", data.email).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="Account not found.")
    user = user.data[0]

    access_token = create_access_token(email=user["email"], role=user["role"], workspace_id=user.get("workspace_id"))
    refresh_token = create_refresh_token(user["email"])

    return {
        "success": True,
        "token": access_token,
        "refresh_token": refresh_token,
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "workspace_id": user.get("workspace_id"),
        "is_profile_setup": user.get("is_profile_setup", False),
    }


@router.post("/refresh-token")
async def refresh_token_endpoint(data: RefreshRequest):
    token_hash = hash_token(data.refresh_token)

    row = supabase.table("refresh_tokens").select("*").eq("token_hash", token_hash).execute()
    if not row.data:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")
    row = row.data[0]

    if row["revoked"]:
        # Reuse of a revoked token = possible theft. Nuke all sessions for
        # this user, and log it — this used to fail silently, which meant
        # you'd never actually find out if it happened.
        print(f"SECURITY: revoked refresh token reused for {row['user_email']} — revoking all sessions.")
        supabase.table("refresh_tokens").update({"revoked": True}).eq("user_email", row["user_email"]).execute()
        raise HTTPException(status_code=401, detail="Session invalid. Please login again.")

    if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired. Please login again.")

    user = supabase.table("users").select("*").eq("email", row["user_email"]).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="Account not found.")
    user = user.data[0]

    new_refresh_token = create_refresh_token(user["email"])
    supabase.table("refresh_tokens").update({"revoked": True}).eq("token_hash", token_hash).execute()

    access_token = create_access_token(email=user["email"], role=user["role"], workspace_id=user.get("workspace_id"))

    return {"success": True, "token": access_token, "refresh_token": new_refresh_token}


@router.post("/logout")
async def logout(data: LogoutRequest):
    supabase.table("refresh_tokens").update({"revoked": True}).eq("token_hash", hash_token(data.refresh_token)).execute()
    return {"success": True, "message": "Logged out."}
