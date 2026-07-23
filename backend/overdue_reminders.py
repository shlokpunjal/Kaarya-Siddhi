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

from datetime import datetime
from zoneinfo import ZoneInfo

from supabase_client import supabase
from notify_utils import send_push_notification

IST = ZoneInfo("Asia/Kolkata")


def _today_str() -> str:
    return datetime.now(IST).strftime("%Y-%m-%d")


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


def _notify_admin(admin_row: dict | None, task: dict, employee_name: str | None):
    if not admin_row:
        return

    who = employee_name or "An employee"
    message = f"{who}'s task \"{task['title']}\" is overdue (was due {task['deadline'][:10]})."

    supabase.table("notifications").insert({
        "user_id": admin_row["id"],
        "task_id": task["id"],
        "type": "overdue",
        "message": message,
        "is_read": False,
        "metadata": {"deadline": task["deadline"]},
    }).execute()

    send_push_notification(
        admin_row.get("expo_push_token"),
        "Task overdue",
        message,
        data={"type": "overdue", "taskId": task["id"]},
    )


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

    tasks = result.data or []
    notified = 0

    for task in tasks:
        # Skip tasks already notified today (job re-ran same day).
        if task.get("last_overdue_notified_date") == today:
            continue

        try:
            employee_row = _fetch_user(task.get("assigned_to"))
            admin_row = _fetch_user(task.get("created_by"))

            _notify_admin(admin_row, task, employee_row["name"] if employee_row else None)

            supabase.table("tasks").update({
                "last_overdue_notified_date": today
            }).eq("id", task["id"]).execute()

            notified += 1
        except Exception as e:
            # One bad task record shouldn't kill the whole batch.
            print(f"Failed to send overdue reminder for task {task.get('id')}: {e}")

    print(f"Overdue reminders: {notified} task(s) notified for {today}")
    return {"success": True, "date": today, "tasks_notified": notified}
