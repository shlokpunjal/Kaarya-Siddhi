"""
Shared pytest fixtures for the Kaarya Siddhi backend auth tests.

IMPORTANT — read before running:
1. These tests hit your REAL Supabase project via your existing
   supabase_client.py / .env config. Run them against a dev/test Supabase
   project, not production, since they insert and delete real rows in
   `users`, `otp_sessions`, and `refresh_tokens`.
2. BASE_PATH is "" because main.py does app.include_router(auth_router)
   with no prefix, so routes live at root (e.g. /signup, not /auth/signup).
   If you ever add a prefix later, update BASE_PATH here — every test
   uses it, so it's a one-line fix.
3. Brevo email sending IS mocked (test_auth.py never sends a real email).
   The OTP value is also mocked to a fixed code so tests don't need to
   read a real inbox.

Setup:
    cd backend
    pip install pytest httpx pytest-mock
    pytest test/ -v
"""

import uuid

import pytest
from fastapi.testclient import TestClient

from main import app
from supabase_client import supabase

BASE_PATH = ""  # auth_router is included with no prefix in main.py -> routes are at root, e.g. /signup
KNOWN_OTP = "123456"


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limit():
    """
    Runs before every test. TestClient reuses the same fake client host for
    every request, so without this, AUTH_RATE_LIMIT will start rejecting
    requests partway through the suite with 429s.
    """
    limiter = getattr(app.state, "limiter", None)
    if limiter is not None:
        limiter.reset()
    yield


@pytest.fixture
def mock_send_otp_email(mocker):
    """
    Patches the send_email_otp call inside routes/auth.py so no real email
    goes out via Brevo during tests.
    """
    return mocker.patch("routes.auth.send_email_otp", return_value=None)


@pytest.fixture
def fixed_otp(mocker):
    """
    Patches the private OTP generator in routes/auth.py so /send-otp always
    issues KNOWN_OTP instead of a random 6-digit code.
    """
    mocker.patch("routes.auth._generate_otp", return_value=KNOWN_OTP)
    return KNOWN_OTP


@pytest.fixture
def signup_payload():
    """
    A unique signup payload per test run, so re-running the suite doesn't
    collide with "Account already exists" / "name already taken" checks.
    Adjust field names here if they don't match your SignupRequest schema.
    """
    unique = uuid.uuid4().hex[:8]
    return {
        "email": f"pytest_{unique}@example.com",
        "name": f"Pytest User {unique}",
        "phone": "9999999999",
        "role": "employee",
        "department": "Testing",
    }


@pytest.fixture
def cleanup_user(signup_payload):
    """
    Deletes the test user (and any leftover otp/refresh rows) after the
    test finishes, so the suite is safe to re-run without manual DB cleanup.
    """
    yield
    email = signup_payload["email"]
    supabase.table("users").delete().eq("email", email).execute()
    supabase.table("otp_sessions").delete().eq("email", email).execute()
    supabase.table("refresh_tokens").delete().eq("user_email", email).execute()