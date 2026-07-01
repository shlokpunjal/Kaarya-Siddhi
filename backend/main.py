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
from supabase_client import supabase
import requests as http_requests

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
otp_attempts = defaultdict(lambda: {"count": 0, "first_attempt": None, "last_sent": None})


class SendOTPRequest(BaseModel):
    phone: str
    email: str
    role: str  # "admin" or "employee"

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class ConnectRequest(BaseModel):
    employee_email: str
    admin_email: str

class ConnectionRespond(BaseModel):
    employee_email: str
    admin_email: str
    accept: bool


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
    key = f"{data.phone}_{data.email}"
    record = otp_attempts[key]
    now = datetime.now()

    if record["first_attempt"] and now - record["first_attempt"] > timedelta(hours=24):
        otp_attempts[key] = {"count": 0, "first_attempt": None, "last_sent": None}
        record = otp_attempts[key]

    if record["count"] >= 3:
        reset_at = record["first_attempt"] + timedelta(hours=24)
        remaining = reset_at - now
        hrs = int(remaining.total_seconds() // 3600)
        mins = int(remaining.total_seconds() % 3600 // 60)
        raise HTTPException(status_code=429, detail=f"Max OTP attempts reached. Try again in {hrs}h {mins}m")

    if record["last_sent"] and now - record["last_sent"] < timedelta(seconds=30):
        remaining_secs = 30 - int((now - record["last_sent"]).total_seconds())
        raise HTTPException(status_code=429, detail=f"Please wait {remaining_secs} seconds before requesting again")

    if record["count"] == 0:
        otp_attempts[key]["first_attempt"] = now
    otp_attempts[key]["count"] += 1
    otp_attempts[key]["last_sent"] = now

    otp = str(random.randint(100000, 999999))
    otp_store[data.email] = {
        "otp": otp,
        "phone": data.phone,
        "role": data.role
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

    role = stored.get("role", "employee")
    email = data.email
    phone = stored["phone"]

    existing = supabase.table("users").select("*").eq("email", email).execute()

    if not existing.data:
        new_user = supabase.table("users").insert({
            "email": email,
            "mobile_number": phone,
            "role": role,
            "name": email.split("@")[0],
            "password_hash": "otp_login",
            "is_profile_setup": False
        }).execute()

        user_row = new_user.data[0]

        if role == "admin":
            workspace = supabase.table("workspaces").insert({
                "name": f"{email}'s Workspace",
                "owner_email": email
            }).execute()

            workspace_id = workspace.data[0]["id"]

            supabase.table("users").update({"workspace_id": workspace_id}).eq("id", user_row["id"]).execute()
            user_row["workspace_id"] = workspace_id
    else:
        user_row = existing.data[0]

    return {
        "success": True,
        "phone": phone,
        "email": email,
        "role": user_row["role"],
        "workspace_id": user_row.get("workspace_id"),
        "is_profile_setup": user_row.get("is_profile_setup", False),
        "token": "Kaarya_logged_in"
    }


@app.post("/connect-request")
async def connect_request(data: ConnectRequest):
    employee_email = normalize_email(data.employee_email)
    admin_email = normalize_email(data.admin_email)

    admin_result = supabase.table("users").select("*").eq("email", admin_email).eq("role", "admin").execute()
    if not admin_result.data:
        raise HTTPException(status_code=404, detail="Admin not found. Check the email and try again.")

    emp_result = supabase.table("users").select("*").eq("email", employee_email).eq("role", "employee").execute()
    if not emp_result.data:
        raise HTTPException(status_code=404, detail="Employee account not found.")

    employee = emp_result.data[0]

    existing = supabase.table("connections").select("*")\
        .eq("employee_email", employee_email).eq("admin_email", admin_email).execute()

    if existing.data:
        status = existing.data[0]["status"]
        if status == "pending":
            raise HTTPException(status_code=400, detail="Request already sent. Waiting for admin approval.")
        if status == "accepted":
            raise HTTPException(status_code=400, detail="You are already connected to this admin.")

    supabase.table("connections").insert({
        "employee_email": employee_email,
        "admin_email": admin_email,
        "status": "pending"
    }).execute()

    if employee.get("workspace_id"):
        current_workspace = supabase.table("workspaces").select("*").eq("id", employee["workspace_id"]).execute()
        if current_workspace.data:
            current_admin_email = current_workspace.data[0]["owner_email"]
            if current_admin_email != admin_email:
                send_switch_warning_email(current_admin_email, employee_email, admin_email)

    send_connection_request_email(admin_email, employee_email)

    return {"success": True, "message": "Request sent to admin"}


@app.get("/connection-status/{employee_email}/{admin_email}")
async def connection_status(employee_email: str, admin_email: str):
    employee_email = normalize_email(employee_email)
    admin_email = normalize_email(admin_email)

    result = supabase.table("connections").select("*")\
        .eq("employee_email", employee_email).eq("admin_email", admin_email).execute()

    if not result.data:
        return {"status": "not_found"}

    return {"status": result.data[0]["status"]}


@app.post("/connection-respond")
async def connection_respond(data: ConnectionRespond):
    employee_email = normalize_email(data.employee_email)
    admin_email = normalize_email(data.admin_email)
    new_status = "accepted" if data.accept else "rejected"

    supabase.table("connections").update({"status": new_status})\
        .eq("employee_email", employee_email).eq("admin_email", admin_email).execute()

    if data.accept:
        admin_user = supabase.table("users").select("*").eq("email", admin_email).eq("role", "admin").execute()
        new_workspace_id = admin_user.data[0]["workspace_id"]

        employee = supabase.table("users").select("*").eq("email", employee_email).execute().data[0]
        old_workspace_id = employee.get("workspace_id")

        if old_workspace_id and old_workspace_id != new_workspace_id:
            old_workspace = supabase.table("workspaces").select("*").eq("id", old_workspace_id).execute()
            if old_workspace.data:
                old_admin_email = old_workspace.data[0]["owner_email"]

                supabase.table("connections").update({"status": "switched"})\
                    .eq("employee_email", employee_email).eq("admin_email", old_admin_email).execute()

                send_employee_left_email(old_admin_email, employee_email)

        supabase.table("users").update({"workspace_id": new_workspace_id}).eq("email", employee_email).execute()

    send_connection_response_email(employee_email, admin_email, new_status)

    return {"success": True, "message": f"Connection {new_status}"}


def send_email_otp(receiver_email, otp):
    sender_email = os.getenv("EMAIL_ADDRESS")
    sender_password = os.getenv("EMAIL_PASSWORD")

    msg = MIMEMultipart("alternative")
    msg["From"] = sender_email
    msg["To"] = receiver_email
    msg["Subject"] = "Kaarya Siddhi - Your Verification Code"

    html_body = f"""
    <html><body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 0;">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr><td style="background-color:#1A2744; padding:28px 32px;">
            <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:600;">Kaarya Siddhi - Verification Code</h1>
          </td></tr>
          <tr><td style="padding:32px;">
            <p style="color:#333; font-size:15px; margin:0 0 16px;">Dear Kaarya Siddhi User,</p>
            <p style="color:#333; font-size:15px; margin:0 0 24px;">We received a login request for <strong>{receiver_email}</strong>. Your verification code is:</p>
            <div style="text-align:center; margin:0 0 28px;">
              <span style="display:inline-block; font-size:36px; font-weight:700; letter-spacing:8px; color:#1a1a1a; background:#f0f4ff; padding:16px 32px; border-radius:8px; border:1px solid #d0d9f0;">{otp}</span>
            </div>
            <p style="color:#555; font-size:14px; margin:0 0 12px;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
            <p style="color:#555; font-size:14px; margin:0;">If you did not request this, please ignore this email.</p>
          </td></tr>
          <tr><td style="background:#f9f9f9; padding:20px 32px; border-top:1px solid #eeeeee;">
            <p style="color:#999; font-size:12px; margin:0;">Sincerely,<br><strong style="color:#555;">The Kaarya Siddhi Team</strong></p>
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>
    """

    msg.attach(MIMEText(html_body, "html"))
    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(sender_email, sender_password)
    server.sendmail(sender_email, receiver_email, msg.as_string())
    server.quit()


def send_connection_request_email(admin_email, employee_email):
    sender_email = os.getenv("EMAIL_ADDRESS")
    sender_password = os.getenv("EMAIL_PASSWORD")

    msg = MIMEMultipart("alternative")
    msg["From"] = sender_email
    msg["To"] = admin_email
    msg["Subject"] = "Kaarya Siddhi - New Connection Request"

    html_body = f"""
    <html><body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color:#1A2744;">New Connection Request</h2>
      <p><strong>{employee_email}</strong> wants to connect with you on Kaarya Siddhi.</p>
      <p>Open the app to accept or reject this request.</p>
    </body></html>
    """
    msg.attach(MIMEText(html_body, "html"))
    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(sender_email, sender_password)
    server.sendmail(sender_email, admin_email, msg.as_string())
    server.quit()


def send_connection_response_email(employee_email, admin_email, status):
    sender_email = os.getenv("EMAIL_ADDRESS")
    sender_password = os.getenv("EMAIL_PASSWORD")

    msg = MIMEMultipart("alternative")
    msg["From"] = sender_email
    msg["To"] = employee_email
    msg["Subject"] = f"Kaarya Siddhi - Request {status.capitalize()}"

    color = "#16A34A" if status == "accepted" else "#DC2626"
    html_body = f"""
    <html><body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color:{color};">Request {status.capitalize()}</h2>
      <p>Your connection request to <strong>{admin_email}</strong> has been {status}.</p>
    </body></html>
    """
    msg.attach(MIMEText(html_body, "html"))
    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(sender_email, sender_password)
    server.sendmail(sender_email, employee_email, msg.as_string())
    server.quit()


def send_switch_warning_email(old_admin_email, employee_email, new_admin_email):
    sender_email = os.getenv("EMAIL_ADDRESS")
    sender_password = os.getenv("EMAIL_PASSWORD")

    msg = MIMEMultipart("alternative")
    msg["From"] = sender_email
    msg["To"] = old_admin_email
    msg["Subject"] = "Kaarya Siddhi - Employee Requesting to Switch"

    html_body = f"""
    <html><body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color:#E8870A;">Heads up!</h2>
      <p><strong>{employee_email}</strong> has requested to connect with another admin ({new_admin_email}).</p>
      <p>If they accept, this employee will leave your workspace.</p>
    </body></html>
    """
    msg.attach(MIMEText(html_body, "html"))
    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(sender_email, sender_password)
    server.sendmail(sender_email, old_admin_email, msg.as_string())
    server.quit()


def send_employee_left_email(old_admin_email, employee_email):
    sender_email = os.getenv("EMAIL_ADDRESS")
    sender_password = os.getenv("EMAIL_PASSWORD")

    msg = MIMEMultipart("alternative")
    msg["From"] = sender_email
    msg["To"] = old_admin_email
    msg["Subject"] = "Kaarya Siddhi - Employee Left Your Workspace"

    html_body = f"""
    <html><body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color:#DC2626;">Employee Left</h2>
      <p><strong>{employee_email}</strong> has switched to another admin's workspace.</p>
    </body></html>
    """
    msg.attach(MIMEText(html_body, "html"))
    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(sender_email, sender_password)
    server.sendmail(sender_email, old_admin_email, msg.as_string())
    server.quit()


def send_push_notification(push_token, title, body):
    http_requests.post(
        "https://exp.host/--/api/v2/push/send",
        json={"to": push_token, "title": title, "body": body}
    )

    from fastapi import FastAPI
# from routes.excel_report import router as excel_report_router
# from routes.upload import router as upload_router
    from backend.routes.excel_report import router as excel_report_router
    # from backend.routes.upload import router as upload_router
    app = FastAPI()
    app.include_router(excel_report_router)
    # app.include_router(upload_router)