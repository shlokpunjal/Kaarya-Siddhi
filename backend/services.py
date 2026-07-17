import os
import re

import requests
import requests as http_requests

from fastapi import HTTPException


def normalize_email(email: str) -> str:
    email = email.strip().lower()
    email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"

    if not email or not re.match(email_regex, email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    return email


def send_email_otp(receiver_email: str, otp: str):
    text = f"""Kaarya Siddhi - Verification Code

Dear Kaarya Siddhi User,

We received a login request for {receiver_email}. Your verification code is: {otp}

This code is valid for 10 minutes. Do not share it with anyone.

If you did not request this, please ignore this email.

Sincerely,
The Kaarya Siddhi Team
"""

    html = f"""
    <html>
    <head>
      <link href="https://googleapis.com" rel="stylesheet">
      <style>
        body, table, td, p, div, span, h1 {{
          font-family: 'Poppins', Helvetica, Arial, sans-serif !important;
        }}
      </style>
    </head>
    <body style="margin:0; padding:0; font-family: 'Poppins', Helvetica, Arial, sans-serif; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 0;">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr><td style="background-color:#1A2744; padding:28px 32px;">
            <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:600; font-family: 'Poppins', Helvetica, Arial, sans-serif;">Kaarya Siddhi - Verification Code</h1>
          </td></tr>
          <tr><td style="padding:32px;">
            <p style="color:#333; font-size:15px; margin:0 0 16px; font-family: 'Poppins', Helvetica, Arial, sans-serif;">Dear Kaarya Siddhi User,</p>
            <p style="color:#333; font-size:15px; margin:0 0 24px; font-family: 'Poppins', Helvetica, Arial, sans-serif;">We received a login request for <strong>{receiver_email}</strong>. Your verification code is:</p>
            <div style="text-align:center; margin:0 0 28px;">
              <span style="display:inline-block; font-size:36px; font-weight:700; letter-spacing:8px; color:#1a1a1a; background:#f0f4ff; padding:16px 32px; border-radius:8px; border:1px solid #d0d9f0; font-family: 'Poppins', Helvetica, Arial, sans-serif;">{otp}</span>
            </div>
            <p style="color:#555; font-size:14px; margin:0 0 12px; font-family: 'Poppins', Helvetica, Arial, sans-serif;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
            <p style="color:#555; font-size:14px; margin:0; font-family: 'Poppins', Helvetica, Arial, sans-serif;">If you did not request this, please ignore this email.</p>
          </td></tr>
          <tr><td style="background:#f9f9f9; padding:20px 32px; border-top:1px solid #eeeeee;">
            <p style="color:#999; font-size:12px; margin:0; font-family: 'Poppins', Helvetica, Arial, sans-serif;">Sincerely,<br><strong style="color:#555; font-family: 'Poppins', Helvetica, Arial, sans-serif;">The Kaarya Siddhi Team</strong></p>
          </td></tr>
        </table>
      </td></tr></table>
    </body>
    </html>
    """

    response = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={
            "api-key": os.getenv("BREVO_API_KEY"),
            "Content-Type": "application/json",
        },
        json={
            "sender": {"name": "Kaarya Siddhi", "email": os.getenv("EMAIL_ADDRESS")},
            "to": [{"email": receiver_email}],
            "subject": "Kaarya Siddhi Verification Code",
            "htmlContent": html,
            "textContent": text,
        },
        timeout=10,
    )

    if response.status_code >= 400:
        raise Exception(f"Brevo send failed ({response.status_code}): {response.text}")


def send_push_notification(push_token: str, title: str, body: str, data: dict | None = None):
    if not push_token:
        return
    try:
        payload = {"to": push_token, "title": title, "body": body, "sound": "default"}
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