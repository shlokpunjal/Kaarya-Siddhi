# this file has all essentials of authentication like token generation etc
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, Header

from config import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_MINUTES, REFRESH_TOKEN_DAYS
from supabase_client import supabase


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_refresh_token(email: str) -> str:
    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS)

    supabase.table("refresh_tokens").insert({
        "user_email": email,
        "token_hash": hash_token(raw_token),
        "expires_at": expires_at.isoformat(),
    }).execute()

    return raw_token


def create_access_token(email: str, role: str, workspace_id: str | None) -> str:
    payload = {
        "sub": email,
        "role": role,
        "workspace_id": workspace_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM) # the encode function uses the values of payload to encode a token


def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session. Please login again.")


def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header.")

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    return payload