"""
Auth flow tests for routes/auth.py

Covers: signup -> send-otp -> verify-otp -> token issuance, wrong-OTP
rejection, check-name, login (enumeration-safe response), the
save-push-token protected route, refresh-token, and logout.
"""

from conftest import BASE_PATH
from auth_utils import create_access_token


def test_health_check(client):
    r = client.get("/health")
    assert r.status_code == 200


def test_check_name_available(client):
    r = client.post(f"{BASE_PATH}/check-name", json={
        "name": f"totally_unused_name_{__import__('uuid').uuid4().hex[:8]}",
        "role": "employee",
    })
    assert r.status_code == 200
    assert r.json()["available"] is True


def test_signup_stages_pending_signup(client, signup_payload, cleanup_user):
    r = client.post(f"{BASE_PATH}/signup", json=signup_payload)
    assert r.status_code == 200
    assert r.json()["success"] is True


def test_signup_rejects_duplicate_email(client, signup_payload, mock_send_otp_email, fixed_otp, cleanup_user):
    """
    /signup only checks the `users` table, and a row isn't written there
    until /verify-otp completes -- calling /signup twice before verifying
    just re-stages the same pending signup (by design, so someone who
    never got their OTP can retry). So to test the duplicate-email guard,
    we have to complete a full signup first, then try to sign up again.
    """
    client.post(f"{BASE_PATH}/signup", json=signup_payload)
    client.post(f"{BASE_PATH}/send-otp", json={
        "email": signup_payload["email"],
        "role": signup_payload["role"],
    })
    client.post(f"{BASE_PATH}/verify-otp", json={
        "email": signup_payload["email"],
        "otp": fixed_otp,
    })

    r = client.post(f"{BASE_PATH}/signup", json=signup_payload)
    assert r.status_code == 400


def test_send_otp_after_signup(client, signup_payload, mock_send_otp_email, fixed_otp, cleanup_user):
    client.post(f"{BASE_PATH}/signup", json=signup_payload)

    r = client.post(f"{BASE_PATH}/send-otp", json={
        "email": signup_payload["email"],
        "role": signup_payload["role"],
    })
    assert r.status_code == 200
    mock_send_otp_email.assert_called_once()


def test_send_otp_rejects_unknown_account(client, mock_send_otp_email):
    r = client.post(f"{BASE_PATH}/send-otp", json={
        "email": "no_such_account_pytest@example.com",
        "role": "employee",
    })
    assert r.status_code == 404


def test_verify_otp_full_flow_issues_token(client, signup_payload, mock_send_otp_email, fixed_otp, cleanup_user):
    client.post(f"{BASE_PATH}/signup", json=signup_payload)
    client.post(f"{BASE_PATH}/send-otp", json={
        "email": signup_payload["email"],
        "role": signup_payload["role"],
    })

    r = client.post(f"{BASE_PATH}/verify-otp", json={
        "email": signup_payload["email"],
        "otp": fixed_otp,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert "token" in body
    assert "refresh_token" in body
    assert body["role"] == signup_payload["role"]


def test_verify_otp_rejects_wrong_code(client, signup_payload, mock_send_otp_email, fixed_otp, cleanup_user):
    client.post(f"{BASE_PATH}/signup", json=signup_payload)
    client.post(f"{BASE_PATH}/send-otp", json={
        "email": signup_payload["email"],
        "role": signup_payload["role"],
    })

    r = client.post(f"{BASE_PATH}/verify-otp", json={
        "email": signup_payload["email"],
        "otp": "000000",  # deliberately wrong
    })
    assert r.status_code == 400
    assert "attempt" in r.json()["detail"].lower()


def test_verify_otp_without_send_otp_fails(client, signup_payload, cleanup_user):
    """No otp_sessions row with created_at yet -> should not silently pass."""
    client.post(f"{BASE_PATH}/signup", json=signup_payload)

    r = client.post(f"{BASE_PATH}/verify-otp", json={
        "email": signup_payload["email"],
        "otp": "123456",
    })
    assert r.status_code == 400


def test_login_is_enumeration_safe(client):
    """Should return the same shape whether or not the account exists."""
    r1 = client.post(f"{BASE_PATH}/login", json={
        "email": "definitely_not_real_pytest@example.com",
        "phone": "0000000000",
        "role": "employee",
    })
    assert r1.status_code == 200
    assert r1.json() == {"success": True}


def test_save_push_token_requires_auth(client):
    r = client.post(f"{BASE_PATH}/save-push-token", json={"push_token": "abc"})
    assert r.status_code in (401, 403)


def test_save_push_token_with_valid_token(client, signup_payload, cleanup_user):
    """
    Builds a real JWT directly via create_access_token — doesn't require the
    user row to exist for this endpoint, since save-push-token only reads
    `sub` off the token to know which email to update.
    """
    token = create_access_token(email=signup_payload["email"], role="employee", workspace_id=None)
    r = client.post(
        f"{BASE_PATH}/save-push-token",
        json={"push_token": "ExponentPushToken[test]"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["success"] is True


def test_save_push_token_rejects_garbage_token(client):
    r = client.post(
        f"{BASE_PATH}/save-push-token",
        json={"push_token": "abc"},
        headers={"Authorization": "Bearer not.a.real.token"},
    )
    assert r.status_code == 401


def test_refresh_and_logout_flow(client, signup_payload, mock_send_otp_email, fixed_otp, cleanup_user):
    client.post(f"{BASE_PATH}/signup", json=signup_payload)
    client.post(f"{BASE_PATH}/send-otp", json={
        "email": signup_payload["email"],
        "role": signup_payload["role"],
    })
    verify = client.post(f"{BASE_PATH}/verify-otp", json={
        "email": signup_payload["email"],
        "otp": fixed_otp,
    }).json()

    refresh_resp = client.post(f"{BASE_PATH}/refresh-token", json={
        "refresh_token": verify["refresh_token"],
    })
    assert refresh_resp.status_code == 200
    new_tokens = refresh_resp.json()
    assert "token" in new_tokens
    assert new_tokens["refresh_token"] != verify["refresh_token"]

    # Old refresh token should now be revoked -> reuse should be rejected.
    reuse_resp = client.post(f"{BASE_PATH}/refresh-token", json={
        "refresh_token": verify["refresh_token"],
    })
    assert reuse_resp.status_code == 401

    logout_resp = client.post(f"{BASE_PATH}/logout", json={
        "refresh_token": new_tokens["refresh_token"],
    })
    assert logout_resp.status_code == 200