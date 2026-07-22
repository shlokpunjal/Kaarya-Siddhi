# routes/admin.py
# this file has all admin related endpoints here
from fastapi import APIRouter, Depends, HTTPException

from auth_utils import get_current_user
from sheets_sync import sync_tasks_from_sheet
from deadline_reminders import send_deadline_reminders

router = APIRouter()


@router.post("/admin/sync-sheet-tasks")
async def manual_sheet_sync(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can trigger sync.")
    result = sync_tasks_from_sheet()
    return result


@router.post("/admin/send-deadline-reminders")
async def manual_deadline_reminders(current_user: dict = Depends(get_current_user)):
    # Manual trigger for testing — the real one runs daily at 9am IST via
    # the scheduler in main.py. Safe to call anytime: deadline_reminder_sent
    # guards against double-notifying a task that already got its reminder.
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can trigger this.")
    result = send_deadline_reminders()
    return result
