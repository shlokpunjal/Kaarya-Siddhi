"""
Kaarya Siddhi — Backend Smoke Test Script
==========================================
Quick manual sanity check for your deployed (or local) FastAPI backend.
Run this after every deploy to confirm the server is alive and the core
auth flow still works end-to-end.

Usage:
    pip install requests
    python smoke_test.py

Edit BASE_URL below to point at your local server (http://localhost:8000)
or your Render deployment URL.
"""

import requests

# ---- CONFIG: edit these to match your setup ----
BASE_URL = "http://localhost:8000"   # or your Render URL, e.g. "https://kaarya-siddhi.onrender.com"
TEST_EMAIL = "your_test_email@example.com"
TEST_PASSWORD = "TestPassword123!"
TEST_ROLE = "employee"               # match whatever role values your app uses

TIMEOUT = 15


def check(name, condition, extra=""):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {name} {extra}")
    return condition


def test_health():
    print("\n--- Health Check ---")
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        check("Server responds", r.status_code == 200, f"(status={r.status_code})")
        print("Response:", r.text[:200])
    except requests.exceptions.RequestException as e:
        check("Server responds", False, f"(error={e})")


def test_signup_and_otp_flow():
    print("\n--- Signup / OTP Flow ---")
    session = requests.Session()

    # 1. Trigger signup / OTP send
    # Adjust the path and payload keys to match your actual auth.py route
    signup_payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "role": TEST_ROLE,
    }
    try:
        r = session.post(f"{BASE_URL}/auth/signup", json=signup_payload, timeout=TIMEOUT)
        check("Signup/OTP request sent", r.status_code in (200, 201), f"(status={r.status_code})")
        print("Response:", r.text[:300])
    except requests.exceptions.RequestException as e:
        check("Signup/OTP request sent", False, f"(error={e})")
        return

    # 2. Verify OTP — you'll need to manually grab the OTP from your test
    #    inbox/Brevo logs and paste it here, since this is not automated.
    otp_code = input("Enter the OTP received for this test run (or press Enter to skip): ").strip()
    if not otp_code:
        print("Skipping OTP verification step.")
        return

    verify_payload = {"email": TEST_EMAIL, "otp": otp_code}
    try:
        r = session.post(f"{BASE_URL}/auth/verify-otp", json=verify_payload, timeout=TIMEOUT)
        ok = check("OTP verified", r.status_code == 200, f"(status={r.status_code})")
        print("Response:", r.text[:300])
        if ok:
            data = r.json()
            token = data.get("access_token") or data.get("token")
            if token:
                test_protected_route(token)
    except requests.exceptions.RequestException as e:
        check("OTP verified", False, f"(error={e})")


def test_protected_route(token):
    print("\n--- Protected Route Access ---")
    headers = {"Authorization": f"Bearer {token}"}

    # Valid token should succeed
    try:
        r = requests.get(f"{BASE_URL}/users/me", headers=headers, timeout=TIMEOUT)
        check("Access with valid token", r.status_code == 200, f"(status={r.status_code})")
    except requests.exceptions.RequestException as e:
        check("Access with valid token", False, f"(error={e})")

    # No token should be rejected
    try:
        r = requests.get(f"{BASE_URL}/users/me", timeout=TIMEOUT)
        check("Rejects missing token", r.status_code in (401, 403), f"(status={r.status_code})")
    except requests.exceptions.RequestException as e:
        check("Rejects missing token", False, f"(error={e})")

    # Garbage token should be rejected
    try:
        r = requests.get(f"{BASE_URL}/users/me", headers={"Authorization": "Bearer invalid.token.here"}, timeout=TIMEOUT)
        check("Rejects invalid token", r.status_code in (401, 403), f"(status={r.status_code})")
    except requests.exceptions.RequestException as e:
        check("Rejects invalid token", False, f"(error={e})")


def test_role_injection_guard():
    """
    Regression check for the BOLA / role-injection issue you already fixed
    in connections.py — confirms a user can't elevate their own role or
    read another user's connection data by tampering with the payload.
    """
    print("\n--- Role Injection / BOLA Guard ---")
    print("NOTE: fill in a real endpoint + payload here that mirrors the")
    print("vulnerability you fixed, so this keeps failing loudly if it regresses.")


if __name__ == "__main__":
    test_health()
    test_signup_and_otp_flow()
    test_role_injection_guard()
    print("\nDone.")