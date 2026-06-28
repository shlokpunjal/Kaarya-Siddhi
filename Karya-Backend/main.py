from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import resend
import random
import os
from datetime import datetime, timedelta
from collections import defaultdict

load_dotenv()

app = FastAPI()

resend.api_key = os.getenv("RESEND_API_KEY")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

otp_store = {}
otp_attempts = defaultdict(lambda: {"count": 0, "first_attempt": None, "last_sent": None})

# Global daily limit
global_otp_limit = {
    "count": 0,
    "reset_at": datetime.now() + timedelta(hours=24)
}

class SendOTPRequest(BaseModel):
    phone: str
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

def normalize_email(email: str) -> str:
    email = email.strip()
    if email == "@gmail.com" or email.startswith("@"):
        raise HTTPException(status_code=400, detail="Please enter a valid email or username")
    if "@" not in email:
        email = email + "@gmail.com"
    return email.lower()

@app.post("/send-otp")
async def send_otp(data: SendOTPRequest):
    data.email = normalize_email(data.email)

    # Global daily limit check
    now = datetime.now()
    if now >= global_otp_limit["reset_at"]:
        global_otp_limit["count"] = 0
        global_otp_limit["reset_at"] = now + timedelta(hours=24)

    if global_otp_limit["count"] >= 100:
        raise HTTPException(
            status_code=503,
            detail="Sorry for the inconvenience, we are running down for now. Try after 24hrs."
        )

    global_otp_limit["count"] += 1

    key = f"{data.phone}_{data.email}"
    record = otp_attempts[key]

    if record["first_attempt"] and now - record["first_attempt"] > timedelta(hours=24):
        otp_attempts[key] = {"count": 0, "first_attempt": None, "last_sent": None}
        record = otp_attempts[key]

    if record["count"] >= 3:
        reset_at = record["first_attempt"] + timedelta(hours=24)
        remaining = reset_at - now
        hrs = int(remaining.total_seconds() // 3600)
        mins = int(remaining.total_seconds() % 3600 // 60)
        raise HTTPException(
            status_code=429,
            detail=f"Max OTP attempts reached. Try again in {hrs}h {mins}m"
        )

    if record["last_sent"] and now - record["last_sent"] < timedelta(seconds=30):
        remaining_secs = 30 - int((now - record["last_sent"]).total_seconds())
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {remaining_secs} seconds before requesting again"
        )

    if record["count"] == 0:
        otp_attempts[key]["first_attempt"] = now
    otp_attempts[key]["count"] += 1
    otp_attempts[key]["last_sent"] = now

    otp = str(random.randint(100000, 999999))
    otp_store[data.email] = {
        "otp": otp,
        "phone": data.phone,
    }

    send_email_otp(data.email, otp)

    return {
        "success": True,
        "message": f"OTP sent ({otp_attempts[key]['count']}/3 attempts used)"
    }

@app.post("/verify-otp")
async def verify_otp(data: VerifyOTPRequest):
    data.email = normalize_email(data.email)
    stored = otp_store.get(data.email)

    if not stored:
        return {"success": False, "message": "OTP expired"}

    if stored["otp"] != data.otp:
        return {"success": False, "message": "Invalid OTP"}

    del otp_store[data.email]

    return {
        "success": True,
        "phone": stored["phone"],
        "email": data.email,
        "token": "Kaarya_logged_in"
    }

def send_email_otp(receiver_email, otp):
    resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": receiver_email,
        "subject": "Kaarya Siddhi - Your Verification Code",
        "html": f"""
        <html>
          <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table width="520" cellpadding="0" cellspacing="0"
                         style="background:#ffffff; border-radius:8px; overflow:hidden;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="background-color:#1A2744; padding:28px 32px;">
                        <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:600;">
                          Kaarya Siddhi - Verification Code
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:32px;">
                        <p style="color:#333; font-size:15px; margin:0 0 16px;">
                          Dear Kaarya Siddhi User,
                        </p>
                        <p style="color:#333; font-size:15px; margin:0 0 24px;">
                          We received a login request for <strong>{receiver_email}</strong>.
                          Your verification code is:
                        </p>
                        <div style="text-align:center; margin:0 0 28px;">
                          <span style="display:inline-block; font-size:36px; font-weight:700;
                                       letter-spacing:8px; color:#1a1a1a; background:#f0f4ff;
                                       padding:16px 32px; border-radius:8px;
                                       border:1px solid #d0d9f0;">
                            {otp}
                          </span>
                        </div>
                        <p style="color:#555; font-size:14px; margin:0 0 12px;">
                          This code is valid for <strong>10 minutes</strong>.
                          Do not share it with anyone.
                        </p>
                        <p style="color:#555; font-size:14px; margin:0;">
                          If you did not request this, please ignore this email.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#f9f9f9; padding:20px 32px; border-top:1px solid #eeeeee;">
                        <p style="color:#999; font-size:12px; margin:0;">
                          Sincerely,<br>
                          <strong style="color:#555;">The Kaarya Siddhi Team</strong>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
        """
    })