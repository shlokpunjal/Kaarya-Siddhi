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

# NOTE: deadline/overdue/eoffice reminders no longer have a manual-trigger
# route here. That logic moved entirely into Postgres — see
# database/reminders_pg_cron.sql (send_deadline_reminders(),
# send_overdue_reminders(), send_eoffice_reminders(), scheduled via
# pg_cron + sent via pg_net, no app server involved at all). To trigger
# one manually for testing, run e.g. `select send_deadline_reminders();`
# in the Supabase SQL Editor — there's intentionally no HTTP path to
# these anymore (EXECUTE is revoked from anon/authenticated so the
# public API can't be used to spam users with pushes).
