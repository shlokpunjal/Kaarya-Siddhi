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
    other admins in the same workspace. Ordered newest-first so the
    frontend can show the most recently created label at the top
    without needing to re-sort."""
    user = await run_db(
        supabase.table("users").select("id").eq("email", current_user["sub"])
    )
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = user.data[0]["id"]

    result = await run_db(
        supabase.table("task_labels")
        .select("id, name, created_at")
        .eq("created_by", own_id)
        .order("created_at", desc=True)
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
        .select("id, name, created_at")
        .eq("created_by", own_id)
        .ilike("name", name)
    )
    if existing.data:
        return existing.data[0]

    result = await run_db(
        supabase.table("task_labels")
        .insert({"name": name, "created_by": own_id})
        .select("id, name, created_at")
    )
    return result.data[0]


@router.delete("/task-labels/{label_id}")
async def delete_task_label(
    label_id: str, current_user: dict = Depends(get_current_user)
):
    """Removes a custom label the admin created. Scoped to created_by so
    one admin can't delete another admin's label by guessing an id.
    Deleting a label doesn't touch tasks that already have it set as
    their label string — that field is just free text on the task row,
    not a foreign key — so existing tasks keep showing it."""
    user = await run_db(
        supabase.table("users").select("id").eq("email", current_user["sub"])
    )
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    own_id = user.data[0]["id"]

    existing = await run_db(
        supabase.table("task_labels")
        .select("id")
        .eq("id", label_id)
        .eq("created_by", own_id)
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Label not found.")

    await run_db(
        supabase.table("task_labels").delete().eq("id", label_id).eq("created_by", own_id)
    )
    return {"deleted": True, "id": label_id}