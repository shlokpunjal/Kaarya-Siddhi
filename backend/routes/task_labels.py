from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from supabase_client import supabase, run_db
from auth_utils import get_current_user

router = APIRouter()

# Same shape as LabelStr in routes/employee_tasks.py — kept independent
# rather than imported, since this is a standalone small router and the
# two aren't guaranteed to change together.
LabelName = Annotated[str, Field(min_length=1, max_length=60)]


class TaskLabelCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: LabelName


@router.get("/task-labels")
async def get_task_labels(current_user: dict = Depends(get_current_user)):
    """Custom labels this admin has created before, so the picker on
    new-task-admin can offer them again alongside the built-in presets.
    Scoped to the calling admin only (created_by) — not shared across
    other admins in the same workspace."""
    user = await run_db(
        supabase.table("users").select("id").eq("email", current_user["sub"])
    )
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = user.data[0]["id"]

    result = await run_db(
        supabase.table("task_labels")
        .select("id, name")
        .eq("created_by", own_id)
        .order("name")
    )
    return {"labels": result.data or []}


@router.post("/task-labels")
async def create_task_label(
    payload: TaskLabelCreate, current_user: dict = Depends(get_current_user)
):
    """Persists a new custom label so it shows up in the dropdown next
    time. Case-insensitive de-duped via the unique index on
    (created_by, lower(name)) — if it already exists, just return the
    existing row instead of erroring, since from the frontend's
    perspective this is just 'make sure this label is available'."""
    user = await run_db(
        supabase.table("users").select("id").eq("email", current_user["sub"])
    )
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = user.data[0]["id"]

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Label name cannot be empty.")

    existing = await run_db(
        supabase.table("task_labels")
        .select("id, name")
        .eq("created_by", own_id)
        .ilike("name", name)
    )
    if existing.data:
        return existing.data[0]

    result = await run_db(
        supabase.table("task_labels")
        .insert({"name": name, "created_by": own_id})
        .select()
    )
    return result.data[0]