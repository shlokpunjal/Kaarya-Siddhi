# backend/cloudinary_utils.py
#
# Best-effort Cloudinary asset deletion. Mirrors notify_utils.py's
# pattern: never raises, logs and swallows — a failed cleanup call
# must never block or fail the primary delete (task/message row is
# already gone from the DB by the time this runs).

import hashlib
import time
import requests as http_requests

from config import CLOUDINARY_CLOUD_NAME
import os

CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")


def _public_id_from_url(file_url: str) -> str | None:
    """Cloudinary delivery URLs look like:
    https://res.cloudinary.com/<cloud>/<resource_type>/upload/v169.../folder/name.ext
    The public_id Cloudinary needs for deletion is 'folder/name'
    (no extension, no version prefix)."""
    try:
        after_upload = file_url.split("/upload/", 1)[1]
        parts = after_upload.split("/")
        if parts and parts[0].startswith("v") and parts[0][1:].isdigit():
            parts = parts[1:]
        path = "/".join(parts)
        return path.rsplit(".", 1)[0] if "." in path.split("/")[-1] else path
    except (IndexError, AttributeError):
        return None


def _resource_type_from_file_type(file_type: str | None) -> str:
    if file_type and file_type.startswith("image/"):
        return "image"
    # Cloudinary files PDFs under resource_type "image" (not "raw") --
    # it needs that to generate page-preview thumbnails. Guessing "raw"
    # here would hit /raw/destroy on an asset that actually lives under
    # /image/destroy, get back {"result": "not found"}, and silently
    # leave the file undeleted with no error logged.
    if file_type == "application/pdf":
        return "image"
    if file_type and file_type.startswith("video/"):
        return "video"
    return "raw"


def _destroy(public_id: str, resource_type: str) -> dict:
    timestamp = int(time.time())
    to_sign = f"public_id={public_id}&timestamp={timestamp}{CLOUDINARY_API_SECRET}"
    signature = hashlib.sha1(to_sign.encode("utf-8")).hexdigest()
    resp = http_requests.post(
        f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/{resource_type}/destroy",
        data={
            "public_id": public_id,
            "timestamp": timestamp,
            "api_key": CLOUDINARY_API_KEY,
            "signature": signature,
        },
        timeout=8,
    )
    result = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
    return {"status": resp.status_code, "result": result}


def delete_cloudinary_asset(file_url: str, file_type: str | None = None) -> None:
    if not (CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET):
        return
    public_id = _public_id_from_url(file_url)
    if not public_id:
        return

    guessed = _resource_type_from_file_type(file_type)
    # Try the guessed type first; if Cloudinary says "not found", it's
    # more likely we guessed wrong than that the file is truly gone --
    # retry against the other candidates before giving up, so a mime
    # type we didn't anticipate doesn't silently leak storage forever.
    fallback_order = [guessed] + [t for t in ("image", "raw", "video") if t != guessed]

    try:
        for resource_type in fallback_order:
            outcome = _destroy(public_id, resource_type)
            result = outcome["result"]
            if outcome["status"] == 200 and result.get("result") == "ok":
                return
            if outcome["status"] == 200 and result.get("result") == "not found":
                continue  # try the next candidate resource_type
            print(f"[cloudinary_utils] delete failed for {public_id} (resource_type={resource_type}): {outcome['status']} {result}")
            return
        print(f"[cloudinary_utils] delete: {public_id} not found under any resource_type ({fallback_order}) — likely already deleted")
    except Exception as err:
        print(f"[cloudinary_utils] failed to delete {public_id}: {err}")


def delete_cloudinary_assets(files: list[dict]) -> None:
    """files: list of {"file_url": ..., "file_type": ..., "storage_service": ...}.
    Skips anything not on Cloudinary (e.g. storage_service == 'backblaze')."""
    for f in files:
        if f.get("storage_service") != "cloudinary":
            continue
        url = f.get("file_url")
        if url:
            delete_cloudinary_asset(url, f.get("file_type"))