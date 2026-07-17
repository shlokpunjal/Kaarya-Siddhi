# backend/notify_utils.py
#
# Shared Expo push sender. Pulled out of main.py so background jobs
# (deadline_reminders.py, sheets_sync.py, etc.) can send pushes without
# importing main.py itself — importing main.py from a module main.py
# also imports would be a circular import.

import requests as http_requests


def send_push_notification(push_token: str | None, title: str, body: str, data: dict | None = None):
    if not push_token:
        return
    try:
        payload = {
            "to": push_token,
            "title": title,
            "body": body,
            "sound": "default",
        }
        if data:
            payload["data"] = data

        http_requests.post(
            "https://exp.host/--/api/v2/push/send",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
    except Exception as e:
        print(f"Push notification failed: {e}")
