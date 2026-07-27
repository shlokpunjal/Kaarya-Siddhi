# Daily job: for every task that's past its deadline (IST) and still not
# completed, notify the ADMIN who created it that it's overdue. Unlike
# deadline_reminders.py (one-shot "due tomorrow" heads-up to both employee
# and admin), this is admin-only and repeats every day the task stays
# overdue — the admin should keep hearing about it until it's resolved.
#
# WHAT COUNTS AS "OVERDUE":
# deadline (calendar date, IST) is before today AND status is not
# 'completed' or 'in_review'. This matches the app's own definition used
# for the calendar view (see mapStatusToCategory in app/(employee)/
# calendar.tsx and app/(admin)/calendar.tsx) — a task that's been
# submitted and is sitting in review is not "overdue", it's just waiting
# on the admin.
#
# WHY IST, NOT UTC:
# Same reasoning as deadline_reminders.py — tasks.deadline is a plain
# date with no time component, and the app is used in India, so "today"
# has to be India's today, not the server's.
#
# IDEMPOTENCY (WITHOUT LOSING THE "REPEAT DAILY" REQUIREMENT):
# deadline_reminder_sent (used by deadline_reminders.py) is a one-way
# flag — perfect for a reminder that should only ever fire once per
# deadline. Overdue reminders need the opposite: fire once per DAY, for
# as many days as the task stays overdue. So instead of a boolean we use
# tasks.last_overdue_notified_date and compare it to today — if the job
# re-runs later the same day (server restart, manual trigger), a task
# already notified today is skipped; tomorrow it's eligible again
# automatically, with no reset step needed.
#
# PERFORMANCE:
# Previously this fetched the employee and admin one row at a time per
# overdue task (2 queries/task), and create_notification did a THIRD
# query per task to re-look-up the push token it had already just
# fetched. On a Render free-tier instance (which is often cold when the
# external cron hits it) that many sequential round trips was enough by
# itself to exceed the cron scheduler's timeout. Now all the users
# needed are fetched in a single batched query, and all notifications +
# pushes go out in one batched call — see notify_utils.create_notifications_bulk.

from datetime import datetime
from zoneinfo import ZoneInfo

from supabase_client import supabase
from notify_utils import create_notifications_bulk

IST = ZoneInfo("Asia/Kolkata")


def _today_str() -> str:
    return datetime.now(IST).strftime("%Y-%m-%d")


def _fetch_users(user_ids: list[str]) -> dict[str, dict]:
    """One query for every user we need, instead of one query per task."""
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


def send_overdue_reminders() -> dict:
    today = _today_str()

    try:
        result = (
            supabase.table("tasks")
            .select("id, title, deadline, assigned_to, created_by, status, last_overdue_notified_date")
            .lt("deadline", today)
            .not_.in_("status", ["completed", "in_review"])
            .execute()
        )
    except Exception as e:
        print(f"Overdue reminder query failed: {e}")
        return {"success": False, "error": str(e)}

    tasks = [t for t in (result.data or []) if t.get("last_overdue_notified_date") != today]

    if not tasks:
        print(f"Overdue reminders: 0 task(s) notified for {today}")
        return {"success": True, "date": today, "tasks_notified": 0}

    user_ids = [t.get("assigned_to") for t in tasks] + [t.get("created_by") for t in tasks]
    users_by_id = _fetch_users(user_ids)

    notifications = []
    notified_task_ids = []
    for task in tasks:
        admin_row = users_by_id.get(task.get("created_by"))
        if not admin_row:
            continue

        employee_row = users_by_id.get(task.get("assigned_to"))
        who = employee_row["name"] if employee_row else "An employee"
        message = f"{who}'s task \"{task['title']}\" is overdue (was due {task['deadline'][:10]})."

        notifications.append({
            "user_id": admin_row["id"],
            "notif_type": "overdue",
            "message": message,
            "task_id": task["id"],
            "metadata": {"deadline": task["deadline"]},
            "push_token": admin_row.get("expo_push_token"),
        })
        notified_task_ids.append(task["id"])

    create_notifications_bulk(notifications)

    # Flagging last_overdue_notified_date is a plain DB update per row
    # (no external network call), so it isn't the expensive part — but
    # a bad id shouldn't stop the rest from being marked.
    for task_id in notified_task_ids:
        try:
            supabase.table("tasks").update({
                "last_overdue_notified_date": today
            }).eq("id", task_id).execute()
        except Exception as e:
            print(f"Failed to flag task {task_id} as notified: {e}")

    print(f"Overdue reminders: {len(notified_task_ids)} task(s) notified for {today}")
    return {"success": True, "date": today, "tasks_notified": len(notified_task_ids)}
