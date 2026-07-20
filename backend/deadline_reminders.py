# backend/deadline_reminders.py
#
# Daily job: for every task whose deadline is tomorrow (IST) and isn't
# completed yet, notify BOTH the assigned employee and the admin who
# created the task — one `notifications` row + one push each, same
# pattern main.py already uses for connection requests.
#
# WHY "TOMORROW IN IST" AND NOT UTC:
# tasks.deadline is saved as a plain date string ("YYYY-MM-DD", see
# newtask.tsx / extend-deadline.tsx — no time component). The app is
# used in India (en-IN date formatting throughout). Computing "tomorrow"
# in server-local/UTC time would flip to the next day several hours
# before/after India's actual midnight, causing reminders to fire on the
# wrong calendar day from the user's point of view. Asia/Kolkata pins it
# to what the user actually sees as "tomorrow".
#
# IDEMPOTENCY:
# tasks.deadline_reminder_sent flips to true right after a task's pair
# of reminders go out, so re-running this job (e.g. a server restart
# re-triggering the cron mid-day, or the manual /admin/send-deadline-
# reminders trigger below) never double-sends for the same deadline.
# Approving a deadline extension resets that flag back to false (see
# app/notifications/admin-request-review.tsx) — the "day before" is a
# new day-before once the deadline actually moves.
#
# WHY assigned_to / created_by ARE LOOKED UP BY id, NOT email:
# schema.sql's comment claims these columns hold email text, but the
# live app (newtask.tsx, task-detail.tsx, tasks.tsx) stores and reads
# both as user UUIDs. Trust the app code over the stale comment.

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from supabase_client import supabase
from notify_utils import send_push_notification

IST = ZoneInfo("Asia/Kolkata")


def _tomorrow_str() -> str:
    return (datetime.now(IST) + timedelta(days=1)).strftime("%Y-%m-%d")


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


def _notify(user_row: dict | None, task: dict, *, for_admin: bool, employee_name: str | None):
    if not user_row:
        return

    if for_admin:
        who = employee_name or "An employee"
        message = f"{who}'s task \"{task['title']}\" is due tomorrow."
    else:
        message = f"Your task \"{task['title']}\" is due tomorrow."

    supabase.table("notifications").insert({
        "user_id": user_row["id"],
        "task_id": task["id"],
        "type": "deadline",
        "message": message,
        "is_read": False,
        "metadata": {"deadline": task["deadline"]},
    }).execute()

    send_push_notification(
        user_row.get("expo_push_token"),
        "Task due tomorrow",
        message,
        data={"type": "deadline", "taskId": task["id"]},
    )


def send_deadline_reminders() -> dict:
    target = _tomorrow_str()

    try:
        result = (
            supabase.table("tasks")
            .select("id, title, deadline, assigned_to, created_by, status")
            .eq("deadline", target)
            .neq("status", "completed")
            .eq("deadline_reminder_sent", False)
            .execute()
        )
    except Exception as e:
        print(f"Deadline reminder query failed: {e}")
        return {"success": False, "error": str(e)}

    tasks = result.data or []
    notified = 0

    for task in tasks:
        try:
            employee_row = _fetch_user(task.get("assigned_to"))
            admin_row = _fetch_user(task.get("created_by"))

            _notify(employee_row, task, for_admin=False, employee_name=None)
            _notify(admin_row, task, for_admin=True, employee_name=employee_row["name"] if employee_row else None)

            # Mark sent even if one/both users were missing a push token or the
            # user row itself was gone — the reminder logic ran for this task
            # and shouldn't be retried for the same deadline.
            supabase.table("tasks").update({
                "deadline_reminder_sent": True
            }).eq("id", task["id"]).execute()

            notified += 1
        except Exception as e:
            # Don't let one bad task record (bad UUID, missing user, etc.)
            # crash the whole batch — log it and keep going for the rest.
            print(f"Failed to send reminder for task {task.get('id')}: {e}")

    print(f"Deadline reminders: {notified} task(s) notified for {target}")
    return {"success": True, "date": target, "tasks_notified": notified}
