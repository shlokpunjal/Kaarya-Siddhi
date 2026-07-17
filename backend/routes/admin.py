# routes/admin.py
from fastapi import APIRouter, Depends, HTTPException

from auth_utils import get_current_user
from sheets_sync import sync_tasks_from_sheet

router = APIRouter()


@router.post("/admin/sync-sheet-tasks")
async def manual_sheet_sync(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can trigger sync.")
    result = sync_tasks_from_sheet()
    return result