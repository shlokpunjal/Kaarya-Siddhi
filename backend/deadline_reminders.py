# Daily job: for every task whose deadline is tomorrow (IST) and isn't
# completed yet, notify ONLY the user the task is assigned to
# (tasks.assigned_to) — one `notifications` row + one push, same pattern
# main.py already uses for connection requests.
#
# WHY ONLY assigned_to AND NOT created_by TOO:
# Previously this also notified the admin who created the task
# (created_by), separately from the assignee. That meant an admin who
# assigns a task to an employee got a redundant "so-and-so's task is due
# tomorrow" ping for a task that isn't theirs to act on. The reminder is
# about who owns the work, not who created it — so it goes to
# assigned_to only. If an admin assigns a task to themselves, assigned_to
# and created_by are the same id and they still get notified, just once.
# The overdue check (overdue_reminders.py) is what alerts the admin when
# an employee's task is actually late — this job stays focused on giving
# the owner their own heads-up.
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
# tasks.deadline_reminder_sent flips to true right after a task's
# reminder goes out, so re-running this job (e.g. a server restart
# re-triggering the cron mid-day, or the manual /cron/send-deadline-
# reminders trigger below) never double-sends for the same deadline.
# Approving a deadline extension resets that flag back to false (see
# app/notifications/admin-request-review.tsx) — the "day before" is a
# new day-before once the deadline actually moves.
#
# WHY assigned_to / created_by ARE LOOKED UP BY id, NOT email:
# schema.sql's comment claims these columns hold email text, but the
# live app (newtask.tsx, task-detail.tsx, tasks.tsx) stores and reads
# both as user UUIDs. Trust the app code over the stale comment.
#
# PERFORMANCE:
# Previously fetched the assignee one row at a time per task, and
# create_notification did a second, redundant query per task to
# re-fetch the same user's push token. Now every assignee needed is
# fetched in a single batched query and all notifications + pushes go
# out in one batched call — see notify_utils.create_notifications_bulk.

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from supabase_client import supabase
from notify_utils import create_notifications_bulk

IST = ZoneInfo("Asia/Kolkata")


def _tomorrow_str() -> str:
    return (datetime.now(IST) + timedelta(days=1)).strftime("%Y-%m-%d")


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


def send_deadline_reminders() -> dict:
    target = _tomorrow_str()

    try:
        result = (
            supabase.table("tasks")
            .select("id, title, deadline, assigned_to, status")
            .eq("deadline", target)
            .neq("status", "completed")
            .eq("deadline_reminder_sent", False)
            .execute()
        )
    except Exception as e:
        print(f"Deadline reminder query failed: {e}")
        return {"success": False, "error": str(e)}

    tasks = result.data or []
    if not tasks:
        print(f"Deadline reminders: 0 task(s) notified for {target}")
        return {"success": True, "date": target, "tasks_notified": 0}

    users_by_id = _fetch_users([t.get("assigned_to") for t in tasks])

    notifications = []
    for task in tasks:
        assignee_row = users_by_id.get(task.get("assigned_to"))
        if not assignee_row:
            continue
        notifications.append({
            "user_id": assignee_row["id"],
            "notif_type": "deadline",
            "message": f"Your task \"{task['title']}\" is due tomorrow.",
            "task_id": task["id"],
            "metadata": {"deadline": task["deadline"]},
            "push_token": assignee_row.get("expo_push_token"),
        })

    create_notifications_bulk(notifications)

    # Mark every task in this batch as sent, even ones whose assignee
    # was missing or had no user row — the reminder logic ran for them
    # and they shouldn't be retried for the same deadline.
    notified = 0
    for task in tasks:
        try:
            supabase.table("tasks").update({
                "deadline_reminder_sent": True
            }).eq("id", task["id"]).execute()
            notified += 1
        except Exception as e:
            print(f"Failed to flag task {task.get('id')} as reminded: {e}")

    print(f"Deadline reminders: {notified} task(s) notified for {target}")
    return {"success": True, "date": target, "tasks_notified": notified}
