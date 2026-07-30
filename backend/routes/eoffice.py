from fastapi import APIRouter, Depends, HTTPException
from supabase_client import supabase
from auth_utils import get_current_user

router = APIRouter()


def _get_own_workspace(email: str) -> tuple[str, str]:
    """Returns (user_id, workspace_id) for the caller. Raises if the
    account doesn't exist or has no workspace — eOffice files are always
    workspace-scoped, so there's nothing to show/create without one."""
    user = supabase.table("users").select("id, workspace_id").eq("email", email).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    row = user.data[0]
    if not row.get("workspace_id"):
        raise HTTPException(status_code=400, detail="You must be connected to a workspace to use eOffice.")
    return row["id"], row["workspace_id"]


def _attach_pending_with_name(rows: list[dict]) -> list[dict]:
    """pending_with is a user id now, not free text — resolve it to a
    display name for the frontend in one batched lookup instead of
    N+1 queries."""
    ids = {r["pending_with"] for r in rows if r.get("pending_with")}
    if not ids:
        return [{**r, "pending_with_name": None} for r in rows]

    users = supabase.table("users").select("id, name").in_("id", list(ids)).execute()
    names_by_id = {u["id"]: u["name"] for u in users.data or []}
    return [{**r, "pending_with_name": names_by_id.get(r.get("pending_with"))} for r in rows]


@router.get("/eoffice")
async def list_eoffice_files(current_user: dict = Depends(get_current_user)):
    _, workspace_id = _get_own_workspace(current_user["sub"])

    result = (
        supabase.table("e-office")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("sr_no", desc=False)
        .execute()
    )
    return _attach_pending_with_name(result.data or [])


@router.get("/eoffice/{file_id}")
async def get_eoffice_file(file_id: str, current_user: dict = Depends(get_current_user)):
    _, workspace_id = _get_own_workspace(current_user["sub"])

    result = supabase.table("e-office").select("*").eq("id", file_id).eq("workspace_id", workspace_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="File not found.")
    return _attach_pending_with_name(result.data)[0]


@router.post("/eoffice")
async def create_eoffice_file(payload: dict, current_user: dict = Depends(get_current_user)):
    own_id, workspace_id = _get_own_workspace(current_user["sub"])

    pending_with = payload.get("pending_with")
    if not pending_with:
        raise HTTPException(status_code=400, detail="Pending with is required.")

    # pending_with must be a real employee in the same workspace — not
    # an arbitrary id from the client.
    assignee = (
        supabase.table("users")
        .select("id")
        .eq("id", pending_with)
        .eq("workspace_id", workspace_id)
        .execute()
    )
    if not assignee.data:
        raise HTTPException(status_code=400, detail="Selected employee is not in your workspace.")

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
            "file_no": payload.get("file_no"),
            "pending_office": payload.get("pending_office"),
            "pending_with": pending_with,
            "pending_since": payload.get("pending_since"),
            "remark": payload.get("remark"),
            "completed": False,
            "created_by": own_id,
            "workspace_id": workspace_id,
        })
        .select()
        .execute()
    )
    return _attach_pending_with_name(result.data)[0]


@router.patch("/eoffice/{file_id}")
async def update_eoffice_file(file_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    _, workspace_id = _get_own_workspace(current_user["sub"])

    allowed = {"pending_office", "pending_with", "remark", "completed"}
    updates = {k: v for k, v in payload.items() if k in allowed}

    if "pending_with" in updates and updates["pending_with"]:
        assignee = (
            supabase.table("users")
            .select("id")
            .eq("id", updates["pending_with"])
            .eq("workspace_id", workspace_id)
            .execute()
        )
        if not assignee.data:
            raise HTTPException(status_code=400, detail="Selected employee is not in your workspace.")

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
    return _attach_pending_with_name(result.data)[0]