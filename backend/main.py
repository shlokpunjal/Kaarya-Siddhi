from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from supabase_client import supabase

import smtplib
import random
import os

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from datetime import datetime, timedelta
from collections import defaultdict
import uuid

load_dotenv()

app = FastAPI(title="Kaarya Siddhi API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

otp_store = {}

otp_attempts = defaultdict(
    lambda: {
        "count": 0,
        "first_attempt": None,
        "last_sent": None,
    }
)

OTP_EXPIRY_MINUTES = 10
OTP_RESEND_SECONDS = 30
MAX_DAILY_ATTEMPTS = 3

class SignupRequest(BaseModel):

    name: str
    email: str
    phone: str
    role: str

    department: str | None = None
    employee_id: str | None = None


class LoginRequest(BaseModel):

    email: str
    role: str


class SendOTPRequest(BaseModel):

    email: str
    role: str


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

    def normalize_email(email: str):

        email = email.strip()

        if email == "@gmail.com" or email.startswith("@"):

            raise HTTPException(
                status_code=400,
                detail="Please enter a valid email."
            )

        if "@" not in email:
            email += "@gmail.com"
            
        return email.lower()
    
def send_email_otp(receiver_email: str, otp: str):

    sender = os.getenv("EMAIL_ADDRESS")
    password = os.getenv("EMAIL_PASSWORD")

    message = MIMEMultipart("alternative")

    message["From"] = sender
    message["To"] = receiver_email
    message["Subject"] = "Kaarya Siddhi Verification Code"

    html = f"""
    <html>

    <body style="font-family:Arial;background:#F5F5F5;padding:20px;">

    <div style="
        max-width:500px;
        margin:auto;
        background:white;
        border-radius:10px;
        overflow:hidden;
        ">

        <div style="
            background:#1A2744;
            color:white;
            padding:20px;
            ">

            <h2>Kaarya Siddhi</h2>

        </div>

        <div style="padding:25px;">

            <h3>Your OTP</h3>

            <h1
            style="
            letter-spacing:8px;
            color:#E8870A;
            ">{otp}</h1>

            <p>This OTP is valid for 10 minutes.</p>

        </div>

    </div>

    </body>

    </html>
    """

    message.attach(MIMEText(html, "html"))

    server = smtplib.SMTP("smtp.gmail.com", 587)

    server.starttls()

    server.login(sender, password)

    server.sendmail(
        sender,
        receiver_email,
        message.as_string()
    )

    server.quit()

@app.post("/signup")
async def signup(data: SignupRequest):

    data.email = normalize_email(data.email)

    existing = (
        supabase.table("users")
        .select("*")
        .eq("email", data.email)
        .execute()
    )

    if existing.data:

        raise HTTPException(
            status_code=400,
            detail="Account already exists."
        )

    user = (
        supabase.table("users")
        .insert({
            "name": data.name,
            "email": data.email,
            "mobile_number": data.phone,
            "role": data.role,
            "password_hash": "otp_login",
            "is_profile_setup": False
        })
        .execute()
    )

    if data.role == "admin":

        workspace = (
            supabase.table("workspaces")
            .insert({
                "name": f"{data.name}'s Workspace",
                "owner_email": data.email
            })
            .execute()
        )

        workspace_id = workspace.data[0]["id"]

        supabase.table("users").update({

            "workspace_id": workspace_id

        }).eq(

            "email",
            data.email

        ).execute()

    return {

        "success": True,

        "message": "Account Created Successfully"

    }

@app.post("/login")
async def login(data: LoginRequest):

    data.email = normalize_email(data.email)

    user = (
        supabase.table("users")
        .select("*")
        .eq("email", data.email)
        .eq("role", data.role)
        .execute()
    )

    if not user.data:

        raise HTTPException(
            status_code=404,
            detail="Account doesn't exist."
        )

    return {

        "success": True,

        "message": "Account Found"

    }

@app.post("/send-otp")
async def send_otp(data: SendOTPRequest):

    data.email = normalize_email(data.email)

    user = (
        supabase.table("users")
        .select("*")
        .eq("email", data.email)
        .eq("role", data.role)
        .execute()
    )

    if not user.data:
        raise HTTPException(
            status_code=404,
            detail="Account doesn't exist. Please signup."
        )

    record = otp_attempts[data.email]

    now = datetime.now()

    if (
        record["first_attempt"]
        and now - record["first_attempt"] > timedelta(hours=24)
    ):
        otp_attempts[data.email] = {
            "count": 0,
            "first_attempt": None,
            "last_sent": None,
        }

        record = otp_attempts[data.email]

    if record["count"] >= MAX_DAILY_ATTEMPTS:

        raise HTTPException(
            status_code=429,
            detail="Daily OTP limit reached."
        )

    if (
        record["last_sent"]
        and now - record["last_sent"] < timedelta(seconds=OTP_RESEND_SECONDS)
    ):

        wait = OTP_RESEND_SECONDS - int(
            (now - record["last_sent"]).total_seconds()
        )

        raise HTTPException(
            status_code=429,
            detail=f"Please wait {wait} seconds."
        )

    if record["count"] == 0:
        record["first_attempt"] = now

    record["count"] += 1
    record["last_sent"] = now

    otp = str(random.randint(100000, 999999))

    otp_store[data.email] = {
        "otp": otp,
        "role": data.role,
        "created": now,
    }

    send_email_otp(data.email, otp)

    return {
        "success": True,
        "message": "OTP Sent Successfully"
    }

@app.post("/verify-otp")
async def verify_otp(data: VerifyOTPRequest):

    data.email = normalize_email(data.email)

    stored = otp_store.get(data.email)

    if not stored:

        raise HTTPException(
            status_code=400,
            detail="OTP expired."
        )

    if datetime.now() - stored["created"] > timedelta(
        minutes=OTP_EXPIRY_MINUTES
    ):

        del otp_store[data.email]

        raise HTTPException(
            status_code=400,
            detail="OTP expired."
        )

    if stored["otp"] != data.otp:

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP."
        )

    del otp_store[data.email]

    user = (
        supabase.table("users")
        .select("*")
        .eq("email", data.email)
        .execute()
    )

    if not user.data:

        raise HTTPException(
            status_code=404,
            detail="Account not found."
        )

    user = user.data[0]

    return {

        "success": True,

        "token": "Kaarya_logged_in",

        "email": user["email"],

        "role": user["role"],

        "workspace_id": user.get("workspace_id"),

        "is_profile_setup": user.get(
            "is_profile_setup",
            False
        ),
    }

@app.post("/connect-request")
async def connect_request(data: ConnectRequest):

    employee_email = normalize_email(data.employee_email)
    admin_email = normalize_email(data.admin_email)

    # Employee must exist
    employee = (
        supabase.table("users")
        .select("*")
        .eq("email", employee_email)
        .eq("role", "employee")
        .execute()
    )

    if not employee.data:
        raise HTTPException(
            status_code=404,
            detail="Employee account not found."
        )

    # Admin must exist
    admin = (
        supabase.table("users")
        .select("*")
        .eq("email", admin_email)
        .eq("role", "admin")
        .execute()
    )

    if not admin.data:
        raise HTTPException(
            status_code=404,
            detail="Admin account not found."
        )

    employee = employee.data[0]

    # Already connected?
    if employee.get("workspace_id"):

        workspace = (
            supabase.table("workspaces")
            .select("*")
            .eq("id", employee["workspace_id"])
            .execute()
        )

        if workspace.data:

            owner = workspace.data[0]["owner_email"]

            if owner == admin_email:

                raise HTTPException(
                    status_code=400,
                    detail="Already connected to this admin."
                )

    # Pending request already?
    existing = (
        supabase.table("connections")
        .select("*")
        .eq("employee_email", employee_email)
        .eq("admin_email", admin_email)
        .eq("status", "pending")
        .execute()
    )

    if existing.data:

        raise HTTPException(
            status_code=400,
            detail="Request already pending."
        )

    supabase.table("connections").insert({

        "id": str(uuid.uuid4()),

        "employee_email": employee_email,

        "admin_email": admin_email,

        "status": "pending"

    }).execute()

    return {

        "success": True,

        "message": "Connection request sent."

    }

@app.get("/connection-status/{employee_email}/{admin_email}")
async def connection_status(employee_email: str, admin_email: str):

    employee_email = normalize_email(employee_email)
    admin_email = normalize_email(admin_email)

    request = (
        supabase.table("connections")
        .select("*")
        .eq("employee_email", employee_email)
        .eq("admin_email", admin_email)
        .execute()
    )

    if not request.data:

        return {
            "status": "not_found"
        }

    return {

        "status": request.data[0]["status"]

    }

@app.get("/admin/pending/{admin_email}")
async def pending_requests(admin_email: str):

    admin_email = normalize_email(admin_email)

    requests = (
        supabase.table("connections")
        .select("*")
        .eq("admin_email", admin_email)
        .eq("status", "pending")
        .execute()
    )

    return {

        "success": True,

        "requests": requests.data

    }