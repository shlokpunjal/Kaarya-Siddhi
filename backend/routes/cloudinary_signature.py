import os
import time
import hashlib
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from auth_utils import get_current_user

router = APIRouter()

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")


def _sign_params(params: dict) -> str:
    """
    Cloudinary's signing rule: take every param that will be sent to the
    upload API (EXCEPT file, api_key, cloud_name, resource_type), sort them
    alphabetically by key, join as 'key=value&key=value...', append the API
    secret, then SHA-1 hash the whole string.
    """
    to_sign = "&".join(f"{key}={value}" for key, value in sorted(params.items()))
    to_sign += CLOUDINARY_API_SECRET
    return hashlib.sha1(to_sign.encode("utf-8")).hexdigest()


@router.get("/cloudinary/signature")
async def get_cloudinary_signature(
    folder: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    if not (CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET):
        raise HTTPException(
            status_code=500,
            detail="Cloudinary is not configured on the server.",
        )

    timestamp = int(time.time())

    params_to_sign = {"timestamp": timestamp}
    if folder:
        params_to_sign["folder"] = folder

    signature = _sign_params(params_to_sign)

    return {
        "signature": signature,
        "timestamp": timestamp,
        "api_key": CLOUDINARY_API_KEY,
        "cloud_name": CLOUDINARY_CLOUD_NAME,
        "folder": folder,
    }