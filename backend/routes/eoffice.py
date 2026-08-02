from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from supabase_client import supabase
from auth_utils import get_current_user

router = APIRouter()

DateStr = Annotated[str, Field(min_length=1, max_length=40)]

# --- Access policy for eOffice records -------------------------------------
# eOffice files track pending office correspondence for a workspace (i.e. a
# single admin's office and the file movements they're responsible for).
# Every record belongs to exactly one workspace via `workspace_id`, and every
# read/write below is scoped to the caller's own workspace.
#
# Permission model (deliberately explicit): eOffice records can be READ and
# CREATED by any signed-in member (admin or employee) of the owning
# workspace. Updating (PATCH) an existing record is still ADMIN-only. Every
# read/write below is scoped to the caller's own workspace via
# `workspace_id`.
# -----------------------------------------------------------------------


def _require_workspace(current_user: dict) -> str:
    """Returns the caller's workspace_id for any signed-in user (admin or
    employee), otherwise raises. Used by the read (GET) eOffice routes."""
    user = supabase.table("users").select("id, workspace_id").eq("email", current_user["sub"]).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    workspace_id = user.data[0].get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Could not find your workspace.")
    return workspace_id


def _require_admin_with_workspace(current_user: dict) -> str:
    """Returns the caller's workspace_id if they're an admin with one set,
    otherwise raises. Used by the write (POST/PATCH) eOffice routes so only
    admins can create or modify records."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can modify eOffice records.")

    admin = supabase.table("users").select("id, workspace_id").eq("email", current_user["sub"]).execute()
    if not admin.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    workspace_id = admin.data[0].get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Could not find your workspace.")
    return workspace_id


class EofficeFileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    file_no: str = Field(..., min_length=1, max_length=200)
    pending_office: Optional[str] = Field(None, max_length=300)
    pending_with: Optional[str] = Field(None, max_length=300)
    pending_since: Optional[DateStr] = None
    remark: Optional[str] = Field(None, max_length=2000)


class EofficeFileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pending_office: Optional[str] = Field(None, max_length=300)
    pending_with: Optional[str] = Field(None, max_length=300)
    remark: Optional[str] = Field(None, max_length=2000)
    completed: Optional[bool] = None


@router.get("/eoffice")
async def list_eoffice_files(current_user: dict = Depends(get_current_user)):
    workspace_id = _require_workspace(current_user)

    result = (
        supabase.table("e-office")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("sr_no", desc=False)
        .execute()
    )
    return result.data


@router.get("/eoffice/{file_id}")
async def get_eoffice_file(file_id: str, current_user: dict = Depends(get_current_user)):
    workspace_id = _require_workspace(current_user)

    result = supabase.table("e-office").select("*").eq("id", file_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="File not found.")
    row = result.data[0]
    if row.get("workspace_id") != workspace_id:
        raise HTTPException(status_code=403, detail="Not your workspace.")
    return row


@router.post("/eoffice")
async def create_eoffice_file(payload: EofficeFileCreate, current_user: dict = Depends(get_current_user)):
    workspace_id = _require_workspace(current_user)

    user = supabase.table("users").select("id").eq("email", current_user["sub"]).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")

    # sr_no is a per-workspace running number, not global — otherwise one
    # workspace's file count would leak into another's numbering and two
    # admins creating files around the same time could collide.
    existing = (
        supabase.table("e-office")
        .select("sr_no")
        .eq("workspace_id", workspace_id)
        .order("sr_no", desc=True)
        .limit(1)
        .execute()
    )
    next_sr_no = existing.data[0]["sr_no"] + 1 if existing.data else 1

    result = (
        supabase.table("e-office")
        .insert({
            "sr_no": next_sr_no,
            "file_no": payload.file_no,
            "pending_office": payload.pending_office,
            "pending_with": payload.pending_with,
            "pending_since": payload.pending_since,
            "remark": payload.remark,
            "completed": False,
            "created_by": user.data[0]["id"],
            "workspace_id": workspace_id,
        })
        .select()
        .execute()
    )
    return result.data[0]


@router.patch("/eoffice/{file_id}")
async def update_eoffice_file(file_id: str, payload: EofficeFileUpdate, current_user: dict = Depends(get_current_user)):
    workspace_id = _require_workspace(current_user)

    user = supabase.table("users").select("id").eq("email", current_user["sub"]).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = user.data[0]["id"]

    existing = supabase.table("e-office").select("workspace_id, created_by").eq("id", file_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="File not found.")
    if existing.data[0].get("workspace_id") != workspace_id:
        raise HTTPException(status_code=403, detail="Not your workspace.")
    is_creator = existing.data[0].get("created_by") == own_id
    is_admin = current_user.get("role") == "admin"
    if not is_creator and not is_admin:
        raise HTTPException(status_code=403, detail="Only the file's creator or an admin can update it.")

    updates = payload.model_dump(exclude_unset=True)

    if "completed" in updates:
        from datetime import datetime, timezone
        updates["completed_at"] = datetime.now(timezone.utc).isoformat() if updates["completed"] else None

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    result = (
        supabase.table("e-office")
        .update(updates)
        .eq("id", file_id)
        .eq("workspace_id", workspace_id)
        .select()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="File not found.")
    return result.data[0]