from fastapi import FastAPI, HTTPException #basic import for fastapi
from pydantic import BaseModel #validating the input to backend from frontend (such as mail and ph are sent to backend or not)
from fastapi.middleware.cors import CORSMiddleware #the connection point of HTTP and API endpoint
from dotenv import load_dotenv #loading the credentials from .env file
import smtplib #responsible for sending emails
from email.mime.text import MIMEText #formats the email as per the need 
from email.mime.multipart import MIMEMultipart #formats the mail as a master box 
import random #used for otp generation
import os #reading environment variables
from datetime import datetime, timedelta #for the date and time used for applying limits to the otp generation 
from collections import defaultdict #used to initialize datatypes to a default value

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


#For adding @gmail.com at the end
def normalize_email(email: str) -> str:
    email = email.strip()
    if "@" not in email:
        email = email + "@gmail.com"
    return email.lower()

#API endpoint for sending otp
@app.post("/send-otp")
async def send_otp(data: SendOTPRequest):
    data.email = normalize_email(data.email)
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


#API endpoint for verifying otp
@app.post("/verify-otp")
async def verify_otp(data: VerifyOTPRequest):
    data.email = normalize_email(data.email)
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
        "token": "Kaarya_logged_in"
    }


def send_email_otp(receiver_email, otp):
    sender_email = os.getenv("EMAIL_ADDRESS")
    sender_password = os.getenv("EMAIL_PASSWORD")

    msg = MIMEMultipart("alternative")
    msg["From"] = sender_email
    msg["To"] = receiver_email
    msg["Subject"] = "Kaarya Siddhi - Your Verification Code"

    html_body = f"""
    <html>
      <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table width="520" cellpadding="0" cellspacing="0"
                     style="background:#ffffff; border-radius:8px; overflow:hidden;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                <!-- HEADER -->
                <tr>
                  <td style="background-color:#1A2744; padding:28px 32px;">
                    <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:600;">
                      Kaarya Siddhi - Verification Code
                    </h1>
                  </td>
                </tr>

                <!-- BODY -->
                <tr>
                  <td style="padding:32px;">
                    <p style="color:#333; font-size:15px; margin:0 0 16px;">
                      Dear Kaarya Siddhi User,
                    </p>
                    <p style="color:#333; font-size:15px; margin:0 0 24px;">
                      We received a login request for <strong>{receiver_email}</strong>.
                      Your verification code is:
                    </p>

                    <!-- OTP BOX -->
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

                <!-- FOOTER -->
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

    msg.attach(MIMEText(html_body, "html"))

    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(sender_email, sender_password)
    server.sendmail(sender_email, receiver_email, msg.as_string())
    server.quit()