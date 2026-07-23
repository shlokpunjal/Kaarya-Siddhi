# backend/eoffice_reminders.py
#
# Daily job: for every eOffice file still not marked completed, notify the
# user who CREATED it (the one who circulated the physical file, per your
# office workflow — they're the one responsible for marking it complete)
# that it's still pending. Grouped into ONE summary notification per
# creator rather than one per file, so someone with several open files
# gets a single "you have N files pending" instead of a flood.
#
# Runs once a day at 5:00 PM IST. Unlike deadline_reminders.py this has
# no "sent once" guard by design — it's meant to repeat daily for as long
# as files stay open, same reasoning as overdue_reminders.py.

from collections import defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo

from supabase_client import supabase
from notify_utils import send_push_notification

IST = ZoneInfo("Asia/Kolkata")


def _fetch_user(user_id: str | None) -> dict | None:
    if not user_id:
        return None
    result = (
        supabase.table("users")
        .select("id, name, expo_push_token")
        .eq("id", user_id)
        .execute()
    )
    return result.data[0] if result.data else None


def send_eoffice_reminders() -> dict:
    try:
        result = (
            supabase.table("e-office")
            .select("id, file_no, created_by")
            .eq("completed", False)
            .execute()
        )
    except Exception as e:
        print(f"eOffice reminder query failed: {e}")
        return {"success": False, "error": str(e)}

    files = result.data or []
    if not files:
        return {"success": True, "creators_notified": 0}

    # Group open files by creator.
    by_creator: dict[str, list[str]] = defaultdict(list)
    for f in files:
        if f.get("created_by"):
            by_creator[f["created_by"]].append(f["file_no"])

    notified = 0
    for creator_id, file_nos in by_creator.items():
        try:
            user_row = _fetch_user(creator_id)
            if not user_row:
                continue

            count = len(file_nos)
            noun = "file" if count == 1 else "files"
            message = f"You have {count} eOffice {noun} pending completion."

            supabase.table("notifications").insert({
                "user_id": user_row["id"],
                "task_id": None,
                "type": "eoffice_pending",
                "message": message,
                "is_read": False,
                "metadata": {"file_nos": file_nos, "count": count},
            }).execute()

            send_push_notification(
                user_row.get("expo_push_token"),
                "Track your eOffice files",
                message,
                data={"type": "eoffice_pending"},
            )
            notified += 1
        except Exception as e:
            print(f"Failed to send eoffice reminder for creator {creator_id}: {e}")

    print(f"eOffice reminders: {notified} creator(s) notified")
    return {"success": True, "creators_notified": notified}