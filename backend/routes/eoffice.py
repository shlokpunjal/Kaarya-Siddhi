from fastapi import APIRouter, Depends, HTTPException
from supabase_client import supabase
from auth_utils import get_current_user

router = APIRouter()


@router.get("/eoffice")
async def list_eoffice_files(current_user: dict = Depends(get_current_user)):
    result = (
        supabase.table("e-office")
        .select("*")
        .order("sr_no", desc=False)
        .execute()
    )
    return result.data


@router.get("/eoffice/{file_id}")
async def get_eoffice_file(file_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase.table("e-office").select("*").eq("id", file_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="File not found.")
    return result.data[0]


@router.post("/eoffice")
async def create_eoffice_file(payload: dict, current_user: dict = Depends(get_current_user)):
    existing = (
        supabase.table("e-office")
        .select("sr_no")
        .order("sr_no", desc=True)
        .limit(1)
        .execute()
    )
    next_sr_no = existing.data[0]["sr_no"] + 1 if existing.data else 1

    user = supabase.table("users").select("id").eq("email", current_user["sub"]).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")

    result = (
        supabase.table("e-office")
        .insert({
            "sr_no": next_sr_no,
            "file_no": payload.get("file_no"),
            "pending_office": payload.get("pending_office"),
            "pending_with": payload.get("pending_with"),
            "pending_since": payload.get("pending_since"),
            "remark": payload.get("remark"),
            "completed": False,
            "created_by": user.data[0]["id"],
        })
        .select()
        .execute()
    )
    return result.data[0]


@router.patch("/eoffice/{file_id}")
async def update_eoffice_file(file_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    allowed = {"pending_office", "pending_with", "remark", "completed"}
    updates = {k: v for k, v in payload.items() if k in allowed}

    if "completed" in updates:
        from datetime import datetime, timezone
        updates["completed_at"] = datetime.now(timezone.utc).isoformat() if updates["completed"] else None

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    result = supabase.table("e-office").update(updates).eq("id", file_id).select().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="File not found.")
    return result.data[0]