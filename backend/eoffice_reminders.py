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
#
# PERFORMANCE:
# Previously fetched each creator one row at a time in the loop, and
# create_notification did a second, redundant query per creator to
# re-fetch the same push token. Now every creator is fetched in a single
# batched query and all notifications + pushes go out in one batched
# call — see notify_utils.create_notifications_bulk.

from collections import defaultdict

from supabase_client import supabase
from notify_utils import create_notifications_bulk


def _fetch_users(user_ids: list[str]) -> dict[str, dict]:
    ids = sorted({uid for uid in user_ids if uid})
    if not ids:
        return {}
    result = (
        supabase.table("users")
        .select("id, name, expo_push_token")
        .in_("id", ids)
        .execute()
    )
    return {row["id"]: row for row in (result.data or [])}


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

    users_by_id = _fetch_users(list(by_creator.keys()))

    notifications = []
    for creator_id, file_nos in by_creator.items():
        user_row = users_by_id.get(creator_id)
        if not user_row:
            continue

        count = len(file_nos)
        noun = "file" if count == 1 else "files"
        notifications.append({
            "user_id": user_row["id"],
            "notif_type": "eoffice_pending",
            "message": f"You have {count} eOffice {noun} pending completion.",
            "metadata": {"file_nos": file_nos, "count": count},
            "push_token": user_row.get("expo_push_token"),
        })

    create_notifications_bulk(notifications)

    print(f"eOffice reminders: {len(notifications)} creator(s) notified")
    return {"success": True, "creators_notified": len(notifications)}
