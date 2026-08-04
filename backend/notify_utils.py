# backend/notify_utils.py
#
# SINGLE SOURCE OF TRUTH for creating notifications on the backend.
#
# Every route / cron job that needs to notify a user should call
# `create_notification(...)` (writes a `notifications` row + sends the
# push) or `push_only(...)` (push without a DB row, for events that
# already have their own record elsewhere, e.g. extension_requests)
# instead of hand-rolling its own insert + push pair.
#
# EVERYTHING HERE IS BEST-EFFORT AND NEVER RAISES. A notification is a
# side effect of some primary action (accepting a connection, deciding
# an extension request, submitting a task for review, ...). If writing
# the notification row or sending the push fails, that must not fail
# the primary action or crash the request — it gets logged and
# swallowed instead.
#
# --------------------------------------------------------------------
# FIX (see send_push_notification below): Expo's push API returns
# HTTP 200 even when an individual push failed — the real per-message
# result lives in resp.json()["data"][i]["status"] /
# ["details"]["error"]. The previous version of this file only checked
# resp.status_code, so a token that Expo was silently rejecting (e.g.
# "DeviceNotRegistered" after an uninstall, or "InvalidCredentials"
# because the project's Android FCM V1 service-account credentials
# aren't uploaded in Expo/EAS yet) looked exactly like success: no
# error logged, notifications row still written, in-app list still
# fine, tray banner never arrives. This version parses that response
# body, logs the actual reason, and clears expo_push_token from the DB
# when Expo says the token is dead (DeviceNotRegistered) so a stale
# token doesn't just fail forever, silently, on every future push.
# --------------------------------------------------------------------

import requests as http_requests
from supabase_client import supabase

DEFAULT_TITLES = {
    "connection_request": "New Connection Request",
    "connection_pending": "Request Sent",
    "connection_accepted": "Request Accepted",
    "connection_rejected": "Request Rejected",
    "extension_request": "New Extension Request",
    "extension_accepted": "Extension Accepted",
    "extension_rejected": "Extension Rejected",
    "task_assigned": "New Task Assigned",
    "task_in_review": "Task Submitted for Review",
    "overdue": "Task overdue",
}

# Expo error codes that mean "this token will never work again" — safe
# to clear so we stop trying (and so the user's profile/settings screen
# can honestly tell them push isn't configured on this device instead
# of silently doing nothing forever).
_DEAD_TOKEN_ERRORS = {"DeviceNotRegistered"}


def _clear_dead_token(push_token: str) -> None:
    try:
        supabase.table("users").update({
            "expo_push_token": None,
            "push_token_status": "device_not_registered",
        }).eq("expo_push_token", push_token).execute()
    except Exception as e:
        print(f"Failed to clear dead push token: {e}")


def send_push_notification(push_token: str | None, title: str, body: str, data: dict | None = None) -> bool:
    """Fire a single Expo push. Never raises. Returns True only if Expo
    confirms the message was actually accepted for delivery (status
    "ok" in the response body) — NOT just that the HTTP call succeeded,
    since Expo returns HTTP 200 even for pushes it rejects."""
    if not push_token:
        return False
    try:
        payload = {
            "to": push_token,
            "title": title,
            "body": body,
            "sound": "default",
        }
        if data:
            payload["data"] = data

        resp = http_requests.post(
            "https://exp.host/--/api/v2/push/send",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )

        if resp.status_code >= 400:
            print(f"Push notification HTTP error ({resp.status_code}): {resp.text[:300]}")
            return False

        # This is the part that was missing: Expo returns 200 with a
        # body like {"data": {"status": "error", "message": "...",
        # "details": {"error": "DeviceNotRegistered"}}} (single push)
        # or {"data": [...]} (batch). A 200 here does NOT mean the push
        # will actually arrive.
        try:
            body_json = resp.json()
        except ValueError:
            print(f"Push notification: couldn't parse Expo response: {resp.text[:300]}")
            return False

        result = body_json.get("data")
        # Normalize: single-send returns a dict, batch returns a list.
        entries = result if isinstance(result, list) else [result] if result else []

        ok = True
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            status = entry.get("status")
            if status == "ok":
                continue
            ok = False
            error_code = (entry.get("details") or {}).get("error")
            print(
                f"Push rejected by Expo (token={push_token[:20]}..., "
                f"error={error_code}, message={entry.get('message')})"
            )
            if error_code in _DEAD_TOKEN_ERRORS:
                _clear_dead_token(push_token)

        return ok
    except Exception as e:
        print(f"Push notification failed: {e}")
        return False


def _get_push_token(user_id: str | None) -> str | None:
    """Returns the user's push token, or None if there isn't one OR the
    user has notifications_enabled = false. Callers never need to check
    notifications_enabled themselves — this is the one gate. The
    `notifications` table row is written regardless (see
    create_notification below) so it still shows up on their
    in-app notifications page; this only controls whether a push
    (and therefore an OS tray banner) goes out."""
    if not user_id:
        return None
    try:
        result = (
            supabase.table("users")
            .select("expo_push_token, notifications_enabled")
            .eq("id", user_id)
            .execute()
        )
        if not result.data:
            return None
        row = result.data[0]
        if row.get("notifications_enabled") is False:
            return None
        return row.get("expo_push_token")
    except Exception as e:
        print(f"Failed to look up push token for user {user_id}: {e}")
        return None


def create_notification(
    user_id: str,
    notif_type: str,
    message: str,
    task_id: str | None = None,
    metadata: dict | None = None,
    title: str | None = None,
    send_push: bool = True,
) -> bool:
    """Write one `notifications` row for `user_id` and (by default) push
    it to their device. THE single entry point for creating a
    notification — call this instead of inserting into the
    `notifications` table directly, so every row has the same shape
    (same columns, same defaults) and every failure is handled the same
    way everywhere.

    Pass `send_push=False` for self-confirmation rows the user doesn't
    need buzzed about (e.g. "your request is pending" right after they
    submitted it themselves) — the row is still written for their
    notifications screen, it just won't also trigger a push.

    Never raises. Returns True if the DB row was written; a missing/
    expired push token, or a push send failure, is NOT treated as an
    error (that's normal — e.g. the user simply hasn't opened the app
    on a device yet) and doesn't affect the return value.
    """
    metadata = metadata or {}

    row_written = False
    try:
        supabase.table("notifications").insert({
            "user_id": user_id,
            "task_id": task_id,
            "type": notif_type,
            "message": message,
            "is_read": False,
            "metadata": metadata,
        }).execute()
        row_written = True
    except Exception as e:
        print(f"Failed to write notification row (user={user_id}, type={notif_type}): {e}")

    if send_push:
        try:
            push_token = _get_push_token(user_id)
            sent = send_push_notification(
                push_token,
                title or DEFAULT_TITLES.get(notif_type, "Notification"),
                message,
                data={"type": notif_type, "taskId": task_id, **metadata},
            )
            if push_token and not sent:
                print(f"Push NOT delivered for user={user_id}, type={notif_type} (see reason above).")
        except Exception as e:
            print(f"Failed to send push for notification (user={user_id}, type={notif_type}): {e}")

    return row_written


def push_only(user_id: str, title: str, body: str, data: dict | None = None) -> None:
    """Send a push WITHOUT writing a `notifications` row — for events
    that already have their own record elsewhere (e.g. an
    extension_requests row is itself the record; a notifications row
    would just be a duplicate). Never raises."""
    try:
        push_token = _get_push_token(user_id)
        send_push_notification(push_token, title, body, data=data or {})
    except Exception as e:
        print(f"Failed to send push-only notification (user={user_id}): {e}")


def delete_notifications(*, notif_type: str | None = None, task_id: str | None = None,
                          metadata_match: dict | None = None) -> None:
    """Best-effort cleanup of stale/pending notifications (e.g. clearing
    a 'request pending' notification once it's been decided). Never
    raises — this is housekeeping and must not fail the caller's main
    action if the delete itself has a problem."""
    try:
        query = supabase.table("notifications").delete()
        if notif_type is not None:
            query = query.eq("type", notif_type)
        if task_id is not None:
            query = query.eq("task_id", task_id)
        if metadata_match:
            query = query.contains("metadata", metadata_match)
        query.execute()
    except Exception as e:
        print(f"Failed to delete notifications (type={notif_type}, task_id={task_id}): {e}")
