# backend/broadcast_independence_day.py
#
# ONE-OFF SCRIPT — sends a "Happy Independence Day" push to every user
# with a registered device, using the same Expo push logic notify_utils
# already uses elsewhere. Does NOT write a `notifications` table row
# (so it won't show up in the in-app notifications list, and doesn't
# need a new `type` added to the enum/UI just for a one-time greeting).
#
# Run once, manually, from the backend/ directory:
#   python broadcast_independence_day.py --test you@example.com   (send to ONLY this user, real push)
#   python broadcast_independence_day.py --dry-run                (see who'd get it, send nothing)
#   python broadcast_independence_day.py                          (send to everyone, for real)

import argparse
import time

from supabase_client import supabase
from notify_utils import send_push_notification

TITLE = "Happy Independence Day! 🇮🇳"
BODY = "Wishing you a proud and joyful Independence Day from all of us at Kaarya-Siddhi."


def get_recipients(email: str | None = None) -> list[dict]:
    """All users with a live push token who haven't opted out.
    If `email` is given, restrict to just that one user (for testing)."""
    query = supabase.table("users").select("id, name, email, expo_push_token, notifications_enabled")
    if email:
        query = query.eq("email", email)
    result = query.execute()
    rows = result.data or []
    return [
        r for r in rows
        if r.get("expo_push_token") and r.get("notifications_enabled") is not False
    ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="List recipients without sending")
    parser.add_argument("--test", metavar="EMAIL", help="Send ONLY to this user's email (real push, for testing)")
    args = parser.parse_args()

    if args.test:
        recipients = get_recipients(email=args.test)
        if not recipients:
            print(f"No user found with email={args.test} that has a live push token. Nothing sent.")
            return
        print(f"TEST MODE — sending only to: {recipients[0].get('name', args.test)}")
    else:
        recipients = get_recipients()
        print(f"Found {len(recipients)} recipient(s) with an active push token.")

    if args.dry_run:
        for r in recipients:
            print(f"  - {r.get('name', 'Unknown')} ({r['id']})")
        return

    sent, failed = 0, 0
    for r in recipients:
        ok = send_push_notification(r["expo_push_token"], TITLE, BODY)
        if ok:
            sent += 1
        else:
            failed += 1
            print(f"  Failed for {r.get('name', 'Unknown')} ({r['id']})")
        time.sleep(0.1)  # gentle pacing, avoid hammering Expo's API

    print(f"Done. Sent: {sent}, Failed: {failed}")


if __name__ == "__main__":
    main()