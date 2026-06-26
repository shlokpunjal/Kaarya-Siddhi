from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
import os
from datetime import datetime, timedelta
from collections import defaultdict

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

otp_store = {}

# { "phone_email": {"count": int, "first_attempt": datetime, "last_sent": datetime} }
otp_attempts = defaultdict(lambda: {"count": 0, "first_attempt": None, "last_sent": None})

class SendOTPRequest(BaseModel):
    phone: str
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str


@app.post("/send-otp")
async def send_otp(data: SendOTPRequest):
    key = f"{data.phone}_{data.email}"
    record = otp_attempts[key]
    now = datetime.now()

    # Reset count if 24 hours passed since first attempt
    if record["first_attempt"] and now - record["first_attempt"] > timedelta(hours=24):
        otp_attempts[key] = {"count": 0, "first_attempt": None, "last_sent": None}
        record = otp_attempts[key]

    # Block if 3 attempts already used
    if record["count"] >= 3:
        reset_at = record["first_attempt"] + timedelta(hours=24)
        remaining = reset_at - now
        hrs = int(remaining.total_seconds() // 3600)
        mins = int(remaining.total_seconds() % 3600 // 60)
        raise HTTPException(
            status_code=429,
            detail=f"Max OTP attempts reached. Try again in {hrs}h {mins}m"
        )

    # Block if requested again within 30 seconds
    if record["last_sent"] and now - record["last_sent"] < timedelta(seconds=30):
        remaining_secs = 30 - int((now - record["last_sent"]).total_seconds())
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {remaining_secs} seconds before requesting again"
        )

    # Update attempt record
    if record["count"] == 0:
        otp_attempts[key]["first_attempt"] = now
    otp_attempts[key]["count"] += 1
    otp_attempts[key]["last_sent"] = now

    # Generate and store OTP
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
    stored = otp_store.get(data.email)

    if not stored:
        return {
            "success": False,
            "message": "OTP expired"
        }

    if stored["otp"] != data.otp:
        return {
            "success": False,
            "message": "Invalid OTP"
        }

    # Clear OTP after successful verify so it can't be reused
    del otp_store[data.email]

    return {
        "success": True,
        "phone": stored["phone"],
        "email": data.email,
        "token": "karya_logged_in"
    }


def send_email_otp(receiver_email, otp):
    sender_email = os.getenv("EMAIL_ADDRESS")
    sender_password = os.getenv("EMAIL_PASSWORD")

    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = receiver_email
    msg["Subject"] = "Karya Login OTP"

    body = f"""
Your OTP is:

{otp}

Do not share this OTP with anyone.
"""

    msg.attach(MIMEText(body, "plain"))

    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(sender_email, sender_password)
    server.sendmail(sender_email, receiver_email, msg.as_string())
    server.quit()