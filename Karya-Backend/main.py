from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# resend.api_key = os.getenv("RESEND_API_KEY")

otp_store = {}

class SendOTPRequest(BaseModel):
    phone: str
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

@app.post("/send-otp")
async def send_otp(data: SendOTPRequest):

    otp = str(random.randint(100000, 999999))

    otp_store[data.email] = {
        "otp": otp,
        "phone": data.phone,
    }

    send_email_otp(data.email, otp)

    return {
        "success": True,
        "message": "OTP sent"
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

    server.sendmail(
        sender_email,
        receiver_email,
        msg.as_string()
    )

    server.quit()