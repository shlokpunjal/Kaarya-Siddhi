# from fastapi import FastAPI, HTTPException, Depends
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from dotenv import load_dotenv

# from supabase_client import supabase

# import random
# import os

# from email.mime.text import MIMEText
# from email.mime.multipart import MIMEMultipart

# from datetime import datetime, timedelta, timezone
# import uuid
# import jwt
# from fastapi import Header

# import re
# import requests

# import secrets
# import hashlib

# from auth_utils import get_current_user

# import requests as http_requests  # avoid clashing with your existing 'requests' usage if any

# load_dotenv()

# app = FastAPI(title="Kaarya Siddhi API")

# load_dotenv()

# app = FastAPI(title="Kaarya Siddhi API")

# from routes.cloudinary_signature import router as cloudinary_signature_router
# app.include_router(cloudinary_signature_router)

# JWT_SECRET = os.getenv("JWT_SECRET")
# JWT_ALGORITHM = "HS256"
# JWT_EXPIRY_HOURS = 24
# REFRESH_TOKEN_DAYS = 30
# ACCESS_TOKEN_MINUTES = 30

# def hash_token(token: str) -> str:
#     return hashlib.sha256(token.encode()).hexdigest()

# def create_refresh_token(email: str):
#     raw_token = secrets.token_urlsafe(48)
#     expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS)

#     supabase.table("refresh_tokens").insert({
#         "user_email": email,
#         "token_hash": hash_token(raw_token),
#         "expires_at": expires_at.isoformat(),
#     }).execute()

#     return raw_token

# if not JWT_SECRET:
#     raise RuntimeError("JWT_SECRET is not set in .env — add it before starting the server.")

# def create_access_token(email: str, role: str, workspace_id: str | None):
#     payload = {
#         "sub": email,
#         "role": role,
#         "workspace_id": workspace_id,
#         "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
#         "iat": datetime.now(timezone.utc),
#     }
#     return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# def decode_access_token(token: str):
#     try:
#         payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
#         return payload
#     except jwt.ExpiredSignatureError:
#         raise HTTPException(status_code=401, detail="Session expired. Please login again.")
#     except jwt.InvalidTokenError:
#         raise HTTPException(status_code=401, detail="Invalid session. Please login again.")

# def get_current_user(authorization: str = Header(None)):
#     if not authorization or not authorization.startswith("Bearer "):
#         raise HTTPException(status_code=401, detail="Missing or invalid authorization header.")

#     token = authorization.split(" ")[1]
#     payload = decode_access_token(token)
#     return payload

# def send_push_notification(push_token: str, title: str, body: str):
#     if not push_token:
#         return
#     try:
#         http_requests.post(
#             "https://exp.host/--/api/v2/push/send",
#             json={
#                 "to": push_token,
#                 "title": title,
#                 "body": body,
#                 "sound": "default",
#             },
#             headers={"Content-Type": "application/json"},
#             timeout=10,
#         )
#     except Exception as e:
#         print(f"Push notification failed: {e}")


# ALLOWED_ORIGINS = [
#     "http://localhost:8081",
#     "http://localhost:19006",
#     "exp://192.168.31.88:8081",
# ]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=ALLOWED_ORIGINS,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# ALLOWED_ORIGINS = [
#     "http://localhost:8081",       # Expo web dev server (if you ever test on web)
#     "http://localhost:19006",      # Expo web alt port
#     "exp://192.168.31.88:8081",     # Expo Go on your LAN — replace with your actual dev IP
# ]

# # this corsMiddleware tells the fastAPI which applications are allowed to connect to the API
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=ALLOWED_ORIGINS,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # global exception handlers which catch any exception that occurs or any crash occurs
# from fastapi.responses import JSONResponse
# from fastapi.exceptions import RequestValidationError
# from starlette.exceptions import HTTPException as StarletteHTTPException


# @app.exception_handler(StarletteHTTPException)
# async def http_exception_handler(request, exc):
#     return JSONResponse(
#         status_code=exc.status_code,
#         content={"detail": exc.detail},
#     )


# @app.exception_handler(RequestValidationError)
# async def validation_exception_handler(request, exc):
#     return JSONResponse(
#         status_code=422,
#         content={"detail": "Invalid request data. Please check your input."},
#     )


# @app.exception_handler(Exception)
# async def unhandled_exception_handler(request, exc):
#     print(f"UNHANDLED ERROR on {request.url.path}: {exc}")
#     return JSONResponse(
#         status_code=500,
#         content={"detail": "Something went wrong on our end. Please try again."},
#     )


# MAX_VERIFY_ATTEMPTS = 5
# OTP_EXPIRY_MINUTES = 10
# OTP_RESEND_SECONDS = 30
# MAX_DAILY_ATTEMPTS = 3

# # routes of the fastAPI similar to class definition
# class SignupRequest(BaseModel):
#     name: str
#     email: str
#     phone: str
#     role: str
#     department: str | None = None
#     # employee_id: str | None = None


# class LoginRequest(BaseModel):
#     phone: str
#     email: str
#     role: str


# class SendOTPRequest(BaseModel):
#     email: str
#     role: str


# class VerifyOTPRequest(BaseModel):
#     email: str
#     otp: str


# class ConnectRequest(BaseModel):
#     employee_email: str
#     admin_email: str


# class ConnectionRespond(BaseModel):
#     employee_email: str
#     admin_email: str
#     accept: bool

# class SavePushTokenRequest(BaseModel):
#     push_token: str

# class CheckNameRequest(BaseModel):
#     name: str
#     role: str

# # removed auto append for fake usernames to be created
# def normalize_email(email: str):
#     email = email.strip().lower()

#     email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"

#     if not email or not re.match(email_regex, email):
#         raise HTTPException(
#             status_code=400,
#             detail="Please enter a valid email address."
#         )

#     return email

# # the function responsible for sending otp and gets the parameters from the frontend
# def send_email_otp(receiver_email: str, otp: str):

#     text = f"""Kaarya Siddhi - Verification Code

# Dear Kaarya Siddhi User,

# We received a login request for {receiver_email}. Your verification code is: {otp}

# This code is valid for 10 minutes. Do not share it with anyone.

# If you did not request this, please ignore this email.

# Sincerely,
# The Kaarya Siddhi Team
# """

#     # html = f"""
#     # <html><body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f4f4;">
#     #   <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 0;">
#     #     <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
#     #       <tr><td style="background-color:#1A2744; padding:28px 32px;">
#     #         <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:600;">Kaarya Siddhi - Verification Code</h1>
#     #       </td></tr>
#     #       <tr><td style="padding:32px;">
#     #         <p style="color:#333; font-size:15px; margin:0 0 16px;">Dear Kaarya Siddhi User,</p>
#     #         <p style="color:#333; font-size:15px; margin:0 0 24px;">We received a login request for <strong>{receiver_email}</strong>. Your verification code is:</p>
#     #         <div style="text-align:center; margin:0 0 28px;">
#     #           <span style="display:inline-block; font-size:36px; font-weight:700; letter-spacing:8px; color:#1a1a1a; background:#f0f4ff; padding:16px 32px; border-radius:8px; border:1px solid #d0d9f0;">{otp}</span>
#     #         </div>
#     #         <p style="color:#555; font-size:14px; margin:0 0 12px;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
#     #         <p style="color:#555; font-size:14px; margin:0;">If you did not request this, please ignore this email.</p>
#     #       </td></tr>
#     #       <tr><td style="background:#f9f9f9; padding:20px 32px; border-top:1px solid #eeeeee;">
#     #         <p style="color:#999; font-size:12px; margin:0;">Sincerely,<br><strong style="color:#555;">The Kaarya Siddhi Team</strong></p>
#     #       </td></tr>
#     #     </table>
#     #   </td></tr></table>
#     # </body></html>
#     # """
    
#     # Poppins font in the html body of the email to be sent to the user for verification code
#     html = f"""
#     <html>
#     <head>
#       <!-- Import Poppins from Google Fonts -->
#       <link href="https://googleapis.com" rel="stylesheet">
#       <style>
#         /* Ensures supported clients override default fonts */
#         body, table, td, p, div, span, h1 {{
#           font-family: 'Poppins', Helvetica, Arial, sans-serif !important;
#         }}
#       </style>
#     </head>
#     <body style="margin:0; padding:0; font-family: 'Poppins', Helvetica, Arial, sans-serif; background-color:#f4f4f4;">
#       <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 0;">
#         <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
#           <tr><td style="background-color:#1A2744; padding:28px 32px;">
#             <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:600; font-family: 'Poppins', Helvetica, Arial, sans-serif;">Kaarya Siddhi - Verification Code</h1>
#           </td></tr>
#           <tr><td style="padding:32px;">
#             <p style="color:#333; font-size:15px; margin:0 0 16px; font-family: 'Poppins', Helvetica, Arial, sans-serif;">Dear Kaarya Siddhi User,</p>
#             <p style="color:#333; font-size:15px; margin:0 0 24px; font-family: 'Poppins', Helvetica, Arial, sans-serif;">We received a login request for <strong>{receiver_email}</strong>. Your verification code is:</p>
#             <div style="text-align:center; margin:0 0 28px;">
#               <span style="display:inline-block; font-size:36px; font-weight:700; letter-spacing:8px; color:#1a1a1a; background:#f0f4ff; padding:16px 32px; border-radius:8px; border:1px solid #d0d9f0; font-family: 'Poppins', Helvetica, Arial, sans-serif;">{otp}</span>
#             </div>
#             <p style="color:#555; font-size:14px; margin:0 0 12px; font-family: 'Poppins', Helvetica, Arial, sans-serif;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
#             <p style="color:#555; font-size:14px; margin:0; font-family: 'Poppins', Helvetica, Arial, sans-serif;">If you did not request this, please ignore this email.</p>
#           </td></tr>
#           <tr><td style="background:#f9f9f9; padding:20px 32px; border-top:1px solid #eeeeee;">
#             <p style="color:#999; font-size:12px; margin:0; font-family: 'Poppins', Helvetica, Arial, sans-serif;">Sincerely,<br><strong style="color:#555; font-family: 'Poppins', Helvetica, Arial, sans-serif;">The Kaarya Siddhi Team</strong></p>
#           </td></tr>
#         </table>
#       </td></tr></table>
#     </body>
#     </html>
#     """


#     response = requests.post(
#         "https://api.brevo.com/v3/smtp/email",
#         headers={
#             "api-key": os.getenv("BREVO_API_KEY"),
#             "Content-Type": "application/json",
#         },
#         json={
#             "sender": {
#                 "name": "Kaarya Siddhi",
#                 "email": os.getenv("EMAIL_ADDRESS"),
#             },
#             "to": [{"email": receiver_email}],
#             "subject": "Kaarya Siddhi Verification Code",
#             "htmlContent": html,
#             "textContent": text,
#         },
#         timeout=10,
#     )

#     if response.status_code >= 400:
#         raise Exception(f"Brevo send failed ({response.status_code}): {response.text}")
    
    
# @app.post("/save-push-token")
# async def save_push_token(data: SavePushTokenRequest, user: dict = Depends(get_current_user)):
#     email = user.get("sub")

#     supabase.table("users").update({
#         "expo_push_token": data.push_token
#     }).eq("email", email).execute()

#     return {"success": True}


# @app.post("/check-name")
# async def check_name(data: CheckNameRequest):
#     name = data.name.strip()

#     if not name:
#         raise HTTPException(status_code=400, detail="Name cannot be empty.")

#     existing = (
#         supabase.table("users")
#         .select("id")
#         .ilike("name", name)
#         .eq("role", data.role)
#         .execute()
#     )

#     return {"available": len(existing.data) == 0}


# # The fastAPI endpoint which is called when create account is clicked on the frontend side
# @app.post("/signup")
# async def signup(data: SignupRequest):

#     data.email = normalize_email(data.email)
#     data.name = data.name.strip()

#     existing = (
#         supabase.table("users")
#         .select("*")
#         .eq("email", data.email)
#         .execute()
#     )

#     if existing.data:
#         raise HTTPException(status_code=400, detail="Account already exists.")

#     # NEW: per-role name uniqueness check
#     name_check = (
#         supabase.table("users")
#         .select("id")
#         .ilike("name", data.name)
#         .eq("role", data.role)
#         .execute()
#     )

#     if name_check.data:
#         raise HTTPException(status_code=409, detail="This name is already taken.")

#     pending_data = {
#         "name": data.name,
#         "phone": data.phone,
#         "role": data.role,
#         "department": data.department,
#     }

#     supabase.table("otp_sessions").upsert({
#         "email": data.email,
#         "otp": "",
#         "role": data.role,
#         "pending_signup": pending_data,
#     }).execute()

#     return {"success": True, "message": "Signup staged. Please verify OTP."}


# @app.post("/login")
# async def login(data: LoginRequest):

#     data.email = normalize_email(data.email)

#     user = (
#         supabase.table("users")
#         .select("*")
#         .eq("email", data.email)
#         .eq("mobile_number", data.phone)
#         .eq("role", data.role)
#         .execute()
#     )
#     print(user.data)

#     if not user.data:

#         raise HTTPException(
#             status_code=404,
#             detail="Account doesn't exist."
#         )

#     return {
#         "success": True,
#         "message": "Account Found"
#     }

# @app.post("/send-otp")
# async def send_otp(data: SendOTPRequest):

#     data.email = normalize_email(data.email)

#     user = (
#         supabase.table("users")
#         .select("*")
#         .eq("email", data.email)
#         .eq("role", data.role)
#         .execute()
#     )

#     session = (
#         supabase.table("otp_sessions")
#         .select("*")
#         .eq("email", data.email)
#         .execute()
#     )
#     session_row = session.data[0] if session.data else None

#     if not user.data and not (session_row and session_row.get("pending_signup")):
#         raise HTTPException(status_code=404, detail="Account doesn't exist. Please signup.")

#     now = datetime.now(timezone.utc)

#     first_attempt = (
#         datetime.fromisoformat(session_row["first_attempt_at"])
#         if session_row and session_row.get("first_attempt_at")
#         else None
#     )
#     last_sent = (
#         datetime.fromisoformat(session_row["last_sent_at"])
#         if session_row and session_row.get("last_sent_at")
#         else None
#     )
#     daily_count = session_row["daily_count"] if session_row else 0

#     if first_attempt and now - first_attempt > timedelta(hours=24):
#         daily_count = 0
#         first_attempt = None

#     if daily_count >= MAX_DAILY_ATTEMPTS:
#         raise HTTPException(status_code=429, detail="Daily OTP limit reached.")

#     if last_sent and now - last_sent < timedelta(seconds=OTP_RESEND_SECONDS):
#         wait = OTP_RESEND_SECONDS - int((now - last_sent).total_seconds())
#         raise HTTPException(status_code=429, detail=f"Please wait {wait} seconds.")

#     otp = str(random.randint(100000, 999999))

#     try:
#         send_email_otp(data.email, otp)
#     except Exception as e:
#         print(f"OTP email failed for {data.email}: {e}")
#         raise HTTPException(
#             status_code=500,
#             detail="Failed to send OTP email. Please check your email address and try again."
#         )

#     if daily_count == 0:
#         first_attempt = now

#     supabase.table("otp_sessions").upsert({
#         "email": data.email,
#         "otp": otp,
#         "role": data.role,
#         "created_at": now.isoformat(),
#         "verify_attempts": 0,
#         "daily_count": daily_count + 1,
#         "first_attempt_at": first_attempt.isoformat() if first_attempt else None,
#         "last_sent_at": now.isoformat(),
#         "pending_signup": session_row.get("pending_signup") if session_row else None,
#     }).execute()

#     return {"success": True, "message": "OTP Sent Successfully"}

# @app.post("/verify-otp")
# async def verify_otp(data: VerifyOTPRequest):

#     data.email = normalize_email(data.email)

#     session = (
#         supabase.table("otp_sessions")
#         .select("*")
#         .eq("email", data.email)
#         .execute()
#     )

#     if not session.data:
#         raise HTTPException(status_code=400, detail="OTP expired.")

#     session_row = session.data[0]
#     created = datetime.fromisoformat(session_row["created_at"])

#     if datetime.now(timezone.utc) - created > timedelta(minutes=OTP_EXPIRY_MINUTES):
#         supabase.table("otp_sessions").delete().eq("email", data.email).execute()
#         raise HTTPException(status_code=400, detail="OTP expired.")

#     if session_row["verify_attempts"] >= MAX_VERIFY_ATTEMPTS:
#         supabase.table("otp_sessions").delete().eq("email", data.email).execute()
#         raise HTTPException(
#             status_code=429,
#             detail="Too many incorrect attempts. Please request a new OTP."
#         )

#     if session_row["otp"] != data.otp:
#         new_attempts = session_row["verify_attempts"] + 1
#         supabase.table("otp_sessions").update({
#             "verify_attempts": new_attempts
#         }).eq("email", data.email).execute()

#         remaining = MAX_VERIFY_ATTEMPTS - new_attempts
#         raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempt(s) remaining.")

#     pending = session_row.get("pending_signup")

#     if pending:
#         # Re-check name uniqueness right before creating the account
#         name_recheck = (
#             supabase.table("users")
#             .select("id")
#             .ilike("name", pending["name"])
#             .eq("role", pending["role"])
#             .execute()
#         )

#         if name_recheck.data:
#             supabase.table("otp_sessions").delete().eq("email", data.email).execute()
#             raise HTTPException(
#                 status_code=409,
#                 detail="This name was just taken by someone else. Please go back and choose a different name."
#             )

#         supabase.table("users").insert({
#             "name": pending["name"],
#             "email": data.email,
#             "mobile_number": pending["phone"],
#             "role": pending["role"],
#             "department": pending["department"],
#             "is_profile_setup": False,
#         }).execute()

#         if pending["role"] == "admin":
#             workspace = (
#                 supabase.table("workspaces")
#                 .insert({
#                     "name": f"{pending['name']}'s Workspace",
#                     "owner_email": data.email,
#                 })
#                 .execute()
#             )
#             workspace_id = workspace.data[0]["id"]

#             supabase.table("users").update({
#                 "workspace_id": workspace_id
#             }).eq("email", data.email).execute()

#     supabase.table("otp_sessions").delete().eq("email", data.email).execute()

#     user = (
#         supabase.table("users")
#         .select("*")
#         .eq("email", data.email)
#         .execute()
#     )

#     if not user.data:
#         raise HTTPException(status_code=404, detail="Account not found.")

#     user = user.data[0]

#     access_token = create_access_token(
#         email=user["email"],
#         role=user["role"],
#         workspace_id=user.get("workspace_id"),
#     )
#     refresh_token = create_refresh_token(user["email"])
#     return {
#         "success": True,
#         "token": access_token,
#         "refresh_token": refresh_token,
#         "id": user["id"],
#         "email": user["email"],
#         "role": user["role"],
#         "workspace_id": user.get("workspace_id"),
#         "is_profile_setup": user.get("is_profile_setup", False),
#     }

# @app.post("/connect-request")
# async def connect_request(data: ConnectRequest, current_user: dict = Depends(get_current_user)):
#     employee_email = normalize_email(data.employee_email)
#     admin_email = normalize_email(data.admin_email)

#     # Employee must exist
#     employee = (
#         supabase.table("users")
#         .select("*")
#         .eq("email", employee_email)
#         .eq("role", "employee")
#         .execute()
#     )

#     if not employee.data:
#         raise HTTPException(
#             status_code=404,
#             detail="Employee account not found."
#         )

#     print("========== CONNECT REQUEST ==========")
#     print("Employee:", employee_email)
#     print("Admin:", admin_email)
#     # Admin must exist
#     admin = (
#         supabase.table("users")
#         .select("*")
#         .eq("email", admin_email)
#         .eq("role", "admin")
#         .execute()
#     )
#     print("Admin query result:", admin.data)
#     if not admin.data:
#         raise HTTPException(
#             status_code=404,
#             detail="Admin account not found."
#         )

#     employee = employee.data[0]

#     # Already connected?
#     if employee.get("workspace_id"):

#         workspace = (
#             supabase.table("workspaces")
#             .select("*")
#             .eq("id", employee["workspace_id"])
#             .execute()
#         )

#         if workspace.data:

#             owner = workspace.data[0]["owner_email"]

#             if owner == admin_email:

#                 raise HTTPException(
#                     status_code=400,
#                     detail="Already connected to this admin."
#                 )

#     # Pending request already?
#     existing_row = (
#         supabase.table("connections")
#         .select("*")
#         .eq("employee_email", employee_email)
#         .eq("admin_email", admin_email)
#         .execute()
#     )

#     if existing_row.data:
#         supabase.table("connections").update({
#             "status": "pending"
#         }).eq("employee_email", employee_email).eq("admin_email", admin_email).execute()
#     else:
#         supabase.table("connections").insert({
#             "id": str(uuid.uuid4()),
#             "employee_email": employee_email,
#             "admin_email": admin_email,
#             "status": "pending"
#         }).execute()

#     return {
#         "success": True,
#         "message": "Connection request sent."
#     }


# @app.get("/connection-status/{employee_email}/{admin_email}")
# async def connection_status(employee_email: str, admin_email: str):

#     employee_email = normalize_email(employee_email)
#     admin_email = normalize_email(admin_email)

#     request = (
#         supabase.table("connections")
#         .select("*")
#         .eq("employee_email", employee_email)
#         .eq("admin_email", admin_email)
#         .execute()
#     )

#     if not request.data:

#         return {
#             "status": "not_found"
#         }

#     return {

#         "status": request.data[0]["status"]

#     }

# @app.get("/admin/pending/{admin_email}")
# async def pending_requests(admin_email: str, current_user: dict = Depends(get_current_user)):

#     admin_email = normalize_email(admin_email)

#     requests = (
#         supabase.table("connections")
#         .select("*")
#         .eq("admin_email", admin_email)
#         .eq("status", "pending")
#         .execute()
#     )

#     return {

#         "success": True,

#         "requests": requests.data

#     }

# @app.post("/connection-respond")
# async def connection_respond(data: ConnectionRespond, current_user: dict = Depends(get_current_user)):
#     employee_email = normalize_email(data.employee_email)
#     admin_email = normalize_email(data.admin_email)
#     new_status = "accepted" if data.accept else "rejected"

#     connection = (
#         supabase.table("connections")
#         .select("*")
#         .eq("employee_email", employee_email)
#         .eq("admin_email", admin_email)
#         .execute()
#     )

#     if not connection.data:
#         raise HTTPException(status_code=404, detail="Connection request not found.")

#     supabase.table("connections").update({
#         "status": new_status
#     }).eq("employee_email", employee_email).eq("admin_email", admin_email).execute()

#     if not data.accept:
#         # Notify the employee their request was rejected
#         rejected_employee = (
#             supabase.table("users")
#             .select("*")
#             .eq("email", employee_email)
#             .execute()
#         )
#         if rejected_employee.data:
#             token = rejected_employee.data[0].get("expo_push_token")
#             send_push_notification(
#                 token,
#                 "Request Rejected",
#                 f"{admin_email} has declined your connection request.",
#             )

#         return {"success": True, "message": "Request Rejected"}

#     admin = (
#         supabase.table("users")
#         .select("*")
#         .eq("email", admin_email)
#         .execute()
#     )
#     admin = admin.data[0]

#     workspace_id = admin.get("workspace_id")
#     if not workspace_id:
#         workspace = (
#             supabase.table("workspaces")
#             .insert({
#                 "name": f"{admin_email}'s Workspace",
#                 "owner_email": admin_email
#             })
#             .execute()
#         )
#         workspace_id = workspace.data[0]["id"]

#         supabase.table("users").update({
#             "workspace_id": workspace_id
#         }).eq("email", admin_email).execute()

#     employee = (
#         supabase.table("users")
#         .select("*")
#         .eq("email", employee_email)
#         .execute()
#     )
#     employee = employee.data[0]

#     supabase.table("users").update({
#         "workspace_id": workspace_id
#     }).eq("email", employee_email).execute()

#     # Notify the employee their request was accepted
#     employee_token = employee.get("expo_push_token")
#     send_push_notification(
#         employee_token,
#         "Request Accepted",
#         f"{admin_email} has accepted your connection request.",
#     )

#     return {
#         "success": True,
#         "message": "Employee Connected Successfully",
#         "workspace_id": workspace_id
#     }
    
    
# @app.get("/employee/connection-status/{employee_email}")
# async def employee_connection_status(employee_email: str, current_user: dict = Depends(get_current_user)):

#     employee_email = normalize_email(employee_email)

#     request = (
#         supabase.table("connections")
#         .select("*")
#         .eq("employee_email", employee_email)
#         .order("id", desc=True)
#         .limit(1)
#         .execute()
#     )

#     if not request.data:
#         return {
#             "status": "not_found"
#         }

#     return {
#         "status": request.data[0]["status"],
#         "admin_email": request.data[0]["admin_email"]
#     }

# @app.get("/me")
# async def get_me(current_user: dict = Depends(get_current_user)):
#     user = (
#         supabase.table("users")
#         .select("*")
#         .eq("email", current_user["sub"])
#         .execute()
#     )

#     if not user.data:
#         raise HTTPException(status_code=401, detail="Account no longer exists.")

#     return user.data[0]
    
# class RefreshRequest(BaseModel):
#     refresh_token: str

# @app.post("/refresh-token")
# async def refresh_token_endpoint(data: RefreshRequest):
#     token_hash = hash_token(data.refresh_token)

#     row = (
#         supabase.table("refresh_tokens")
#         .select("*")
#         .eq("token_hash", token_hash)
#         .execute()
#     )

#     if not row.data:
#         raise HTTPException(status_code=401, detail="Invalid refresh token.")

#     row = row.data[0]

#     if row["revoked"]:
#         # Reuse of a revoked token = possible theft. Nuke all sessions for this user.
#         supabase.table("refresh_tokens").update({"revoked": True}) \
#             .eq("user_email", row["user_email"]).execute()
#         raise HTTPException(status_code=401, detail="Session invalid. Please login again.")

#     if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
#         raise HTTPException(status_code=401, detail="Refresh token expired. Please login again.")

#     user = (
#         supabase.table("users")
#         .select("*")
#         .eq("email", row["user_email"])
#         .execute()
#     )
#     if not user.data:
#         raise HTTPException(status_code=404, detail="Account not found.")
#     user = user.data[0]

#     # Rotate: issue a new refresh token, revoke the old one
#     new_refresh_token = create_refresh_token(user["email"])
#     supabase.table("refresh_tokens").update({"revoked": True}) \
#         .eq("token_hash", token_hash).execute()

#     access_token = create_access_token(
#         email=user["email"], role=user["role"], workspace_id=user.get("workspace_id")
#     )

#     return {
#         "success": True,
#         "token": access_token,
#         "refresh_token": new_refresh_token,
#     }

# class LogoutRequest(BaseModel):
#     refresh_token: str

# @app.post("/logout")
# async def logout(data: LogoutRequest):
#     supabase.table("refresh_tokens").update({"revoked": True}) \
#         .eq("token_hash", hash_token(data.refresh_token)).execute()
#     return {"success": True, "message": "Logged out."}




# from routes.excel_report import router as excel_report_router   
# # from backend.routes.upload import router as upload_router    
# app.include_router(excel_report_router)    
# # app.include_router(upload_router)

# from routes.pdf_report import router as pdf_report_router
# app.include_router(pdf_report_router)

# from routes.cloudinary_signature import router as cloudinary_signature_router
# app.include_router(cloudinary_signature_router)



from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from supabase_client import supabase

import random
import os

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from datetime import datetime, timedelta, timezone
import uuid
import jwt
from fastapi import Header

import re
import requests

import secrets
import hashlib

from auth_utils import get_current_user

import requests as http_requests  # avoid clashing with your existing 'requests' usage if any

from apscheduler.schedulers.background import BackgroundScheduler
from sheets_sync import sync_tasks_from_sheet

load_dotenv()

app = FastAPI(title="Kaarya Siddhi API")

scheduler = BackgroundScheduler()
scheduler.add_job(sync_tasks_from_sheet, "interval", minutes=5)
scheduler.start()

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
REFRESH_TOKEN_DAYS = 30
ACCESS_TOKEN_MINUTES = 30

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def create_refresh_token(email: str):
    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS)

    supabase.table("refresh_tokens").insert({
        "user_email": email,
        "token_hash": hash_token(raw_token),
        "expires_at": expires_at.isoformat(),
    }).execute()

    return raw_token

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set in .env — add it before starting the server.")

def create_access_token(email: str, role: str, workspace_id: str | None):
    payload = {
        "sub": email,
        "role": role,
        "workspace_id": workspace_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session. Please login again.")

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header.")

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    return payload

def send_push_notification(push_token: str, title: str, body: str, data: dict | None = None):
    if not push_token:
        return
    try:
        payload = {
            "to": push_token,
            "title": title,
            "body": body,
            "sound": "default",
        }
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


ALLOWED_ORIGINS = [
    "http://localhost:8081",
    "http://localhost:19006",
    "exp://192.168.31.88:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


ALLOWED_ORIGINS = [
    "http://localhost:8081",       # Expo web dev server (if you ever test on web)
    "http://localhost:19006",      # Expo web alt port
    "exp://192.168.31.88:8081",     # Expo Go on your LAN — replace with your actual dev IP
]

# this corsMiddleware tells the fastAPI which applications are allowed to connect to the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# global exception handlers which catch any exception that occurs or any crash occurs
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request data. Please check your input."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    print(f"UNHANDLED ERROR on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. Please try again."},
    )


MAX_VERIFY_ATTEMPTS = 5
OTP_EXPIRY_MINUTES = 10
OTP_RESEND_SECONDS = 30
MAX_DAILY_ATTEMPTS = 3

# routes of the fastAPI similar to class definition
class SignupRequest(BaseModel):
    name: str
    email: str
    phone: str
    role: str
    department: str | None = None
    # employee_id: str | None = None


class LoginRequest(BaseModel):
    phone: str
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

class SavePushTokenRequest(BaseModel):
    push_token: str

class CheckNameRequest(BaseModel):
    name: str
    role: str

# removed auto append for fake usernames to be created
def normalize_email(email: str):
    email = email.strip().lower()

    email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"

    if not email or not re.match(email_regex, email):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid email address."
        )

    return email

# the function responsible for sending otp and gets the parameters from the frontend
def send_email_otp(receiver_email: str, otp: str):

    text = f"""Kaarya Siddhi - Verification Code

Dear Kaarya Siddhi User,

We received a login request for {receiver_email}. Your verification code is: {otp}

This code is valid for 10 minutes. Do not share it with anyone.

If you did not request this, please ignore this email.

Sincerely,
The Kaarya Siddhi Team
"""

    # html = f"""
    # <html><body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f4f4f4;">
    #   <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 0;">
    #     <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    #       <tr><td style="background-color:#1A2744; padding:28px 32px;">
    #         <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:600;">Kaarya Siddhi - Verification Code</h1>
    #       </td></tr>
    #       <tr><td style="padding:32px;">
    #         <p style="color:#333; font-size:15px; margin:0 0 16px;">Dear Kaarya Siddhi User,</p>
    #         <p style="color:#333; font-size:15px; margin:0 0 24px;">We received a login request for <strong>{receiver_email}</strong>. Your verification code is:</p>
    #         <div style="text-align:center; margin:0 0 28px;">
    #           <span style="display:inline-block; font-size:36px; font-weight:700; letter-spacing:8px; color:#1a1a1a; background:#f0f4ff; padding:16px 32px; border-radius:8px; border:1px solid #d0d9f0;">{otp}</span>
    #         </div>
    #         <p style="color:#555; font-size:14px; margin:0 0 12px;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
    #         <p style="color:#555; font-size:14px; margin:0;">If you did not request this, please ignore this email.</p>
    #       </td></tr>
    #       <tr><td style="background:#f9f9f9; padding:20px 32px; border-top:1px solid #eeeeee;">
    #         <p style="color:#999; font-size:12px; margin:0;">Sincerely,<br><strong style="color:#555;">The Kaarya Siddhi Team</strong></p>
    #       </td></tr>
    #     </table>
    #   </td></tr></table>
    # </body></html>
    # """
    
    # Poppins font in the html body of the email to be sent to the user for verification code
    html = f"""
    <html>
    <head>
      <!-- Import Poppins from Google Fonts -->
      <link href="https://googleapis.com" rel="stylesheet">
      <style>
        /* Ensures supported clients override default fonts */
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
            "sender": {
                "name": "Kaarya Siddhi",
                "email": os.getenv("EMAIL_ADDRESS"),
            },
            "to": [{"email": receiver_email}],
            "subject": "Kaarya Siddhi Verification Code",
            "htmlContent": html,
            "textContent": text,
        },
        timeout=10,
    )

    if response.status_code >= 400:
        raise Exception(f"Brevo send failed ({response.status_code}): {response.text}")
    
    
@app.post("/save-push-token")
async def save_push_token(data: SavePushTokenRequest, user: dict = Depends(get_current_user)):
    email = user.get("sub")

    supabase.table("users").update({
        "expo_push_token": data.push_token
    }).eq("email", email).execute()

    return {"success": True}


@app.post("/check-name")
async def check_name(data: CheckNameRequest):
    name = data.name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")

    existing = (
        supabase.table("users")
        .select("id")
        .ilike("name", name)
        .eq("role", data.role)
        .execute()
    )

    return {"available": len(existing.data) == 0}


# The fastAPI endpoint which is called when create account is clicked on the frontend side
@app.post("/signup")
async def signup(data: SignupRequest):

    data.email = normalize_email(data.email)
    data.name = data.name.strip()

    existing = (
        supabase.table("users")
        .select("*")
        .eq("email", data.email)
        .execute()
    )

    if existing.data:
        raise HTTPException(status_code=400, detail="Account already exists.")

    # NEW: per-role name uniqueness check
    name_check = (
        supabase.table("users")
        .select("id")
        .ilike("name", data.name)
        .eq("role", data.role)
        .execute()
    )

    if name_check.data:
        raise HTTPException(status_code=409, detail="This name is already taken.")

    pending_data = {
        "name": data.name,
        "phone": data.phone,
        "role": data.role,
        "department": data.department,
    }

    supabase.table("otp_sessions").upsert({
        "email": data.email,
        "otp": "",
        "role": data.role,
        "pending_signup": pending_data,
    }).execute()

    return {"success": True, "message": "Signup staged. Please verify OTP."}


@app.post("/login")
async def login(data: LoginRequest):

    data.email = normalize_email(data.email)

    user = (
        supabase.table("users")
        .select("*")
        .eq("email", data.email)
        .eq("mobile_number", data.phone)
        .eq("role", data.role)
        .execute()
    )
    print(user.data)

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

    session = (
        supabase.table("otp_sessions")
        .select("*")
        .eq("email", data.email)
        .execute()
    )
    session_row = session.data[0] if session.data else None

    if not user.data and not (session_row and session_row.get("pending_signup")):
        raise HTTPException(status_code=404, detail="Account doesn't exist. Please signup.")

    now = datetime.now(timezone.utc)

    first_attempt = (
        datetime.fromisoformat(session_row["first_attempt_at"])
        if session_row and session_row.get("first_attempt_at")
        else None
    )
    last_sent = (
        datetime.fromisoformat(session_row["last_sent_at"])
        if session_row and session_row.get("last_sent_at")
        else None
    )
    daily_count = session_row["daily_count"] if session_row else 0

    if first_attempt and now - first_attempt > timedelta(hours=24):
        daily_count = 0
        first_attempt = None

    if daily_count >= MAX_DAILY_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Daily OTP limit reached.")

    if last_sent and now - last_sent < timedelta(seconds=OTP_RESEND_SECONDS):
        wait = OTP_RESEND_SECONDS - int((now - last_sent).total_seconds())
        raise HTTPException(status_code=429, detail=f"Please wait {wait} seconds.")

    otp = str(random.randint(100000, 999999))

    try:
        send_email_otp(data.email, otp)
    except Exception as e:
        print(f"OTP email failed for {data.email}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send OTP email. Please check your email address and try again."
        )

    if daily_count == 0:
        first_attempt = now

    supabase.table("otp_sessions").upsert({
        "email": data.email,
        "otp": otp,
        "role": data.role,
        "created_at": now.isoformat(),
        "verify_attempts": 0,
        "daily_count": daily_count + 1,
        "first_attempt_at": first_attempt.isoformat() if first_attempt else None,
        "last_sent_at": now.isoformat(),
        "pending_signup": session_row.get("pending_signup") if session_row else None,
    }).execute()

    return {"success": True, "message": "OTP Sent Successfully"}

@app.post("/verify-otp")
async def verify_otp(data: VerifyOTPRequest):

    data.email = normalize_email(data.email)

    session = (
        supabase.table("otp_sessions")
        .select("*")
        .eq("email", data.email)
        .execute()
    )

    if not session.data:
        raise HTTPException(status_code=400, detail="OTP expired.")

    session_row = session.data[0]
    created = datetime.fromisoformat(session_row["created_at"])

    if datetime.now(timezone.utc) - created > timedelta(minutes=OTP_EXPIRY_MINUTES):
        supabase.table("otp_sessions").delete().eq("email", data.email).execute()
        raise HTTPException(status_code=400, detail="OTP expired.")

    if session_row["verify_attempts"] >= MAX_VERIFY_ATTEMPTS:
        supabase.table("otp_sessions").delete().eq("email", data.email).execute()
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect attempts. Please request a new OTP."
        )

    if session_row["otp"] != data.otp:
        new_attempts = session_row["verify_attempts"] + 1
        supabase.table("otp_sessions").update({
            "verify_attempts": new_attempts
        }).eq("email", data.email).execute()

        remaining = MAX_VERIFY_ATTEMPTS - new_attempts
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempt(s) remaining.")

    pending = session_row.get("pending_signup")

    if pending:
        # Re-check name uniqueness right before creating the account
        name_recheck = (
            supabase.table("users")
            .select("id")
            .ilike("name", pending["name"])
            .eq("role", pending["role"])
            .execute()
        )

        if name_recheck.data:
            supabase.table("otp_sessions").delete().eq("email", data.email).execute()
            raise HTTPException(
                status_code=409,
                detail="This name was just taken by someone else. Please go back and choose a different name."
            )

        supabase.table("users").insert({
            "name": pending["name"],
            "email": data.email,
            "mobile_number": pending["phone"],
            "role": pending["role"],
            "department": pending["department"],
            "is_profile_setup": False,
        }).execute()

        if pending["role"] == "admin":
            workspace = (
                supabase.table("workspaces")
                .insert({
                    "name": f"{pending['name']}'s Workspace",
                    "owner_email": data.email,
                })
                .execute()
            )
            workspace_id = workspace.data[0]["id"]

            supabase.table("users").update({
                "workspace_id": workspace_id
            }).eq("email", data.email).execute()

    supabase.table("otp_sessions").delete().eq("email", data.email).execute()

    user = (
        supabase.table("users")
        .select("*")
        .eq("email", data.email)
        .execute()
    )

    if not user.data:
        raise HTTPException(status_code=404, detail="Account not found.")

    user = user.data[0]

    access_token = create_access_token(
        email=user["email"],
        role=user["role"],
        workspace_id=user.get("workspace_id"),
    )
    refresh_token = create_refresh_token(user["email"])
    return {
        "success": True,
        "token": access_token,
        "refresh_token": refresh_token,
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "workspace_id": user.get("workspace_id"),
        "is_profile_setup": user.get("is_profile_setup", False),
    }

@app.post("/connect-request")
async def connect_request(data: ConnectRequest, current_user: dict = Depends(get_current_user)):
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

    print("========== CONNECT REQUEST ==========")
    print("Employee:", employee_email)
    print("Admin:", admin_email)
    # Admin must exist
    admin = (
        supabase.table("users")
        .select("*")
        .eq("email", admin_email)
        .eq("role", "admin")
        .execute()
    )
    print("Admin query result:", admin.data)
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
    existing_row = (
        supabase.table("connections")
        .select("*")
        .eq("employee_email", employee_email)
        .eq("admin_email", admin_email)
        .execute()
    )

    if existing_row.data:
        supabase.table("connections").update({
            "status": "pending"
        }).eq("employee_email", employee_email).eq("admin_email", admin_email).execute()
    else:
        supabase.table("connections").insert({
            "id": str(uuid.uuid4()),
            "employee_email": employee_email,
            "admin_email": admin_email,
            "status": "pending"
        }).execute()

    # Notify the admin: new connection request
    admin_row = admin.data[0]
    supabase.table("notifications").insert({
        "user_id": admin_row["id"],
        "task_id": None,
        "type": "connection_request",
        "message": f"{employee_email} wants to connect with you.",
        "is_read": False,
        "metadata": {"employee_email": employee_email, "admin_email": admin_email},
    }).execute()
  # inside connect_request — notify the admin
    send_push_notification(
    admin_row.get("expo_push_token"),
    "New Connection Request",
    f"{employee_email} wants to connect with you.",
    data={"type": "connection_request", "employee_email": employee_email, "admin_email": admin_email},
)
    # Notify the employee: request sent, pending
    employee_row = employee
    supabase.table("notifications").insert({
        "user_id": employee_row["id"],
        "task_id": None,
        "type": "connection_pending",
        "message": f"Your connection request to {admin_email} is pending.",
        "is_read": False,
        "metadata": {"employee_email": employee_email, "admin_email": admin_email},
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
async def pending_requests(admin_email: str, current_user: dict = Depends(get_current_user)):

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

@app.post("/connection-respond")
async def connection_respond(data: ConnectionRespond, current_user: dict = Depends(get_current_user)):
    employee_email = normalize_email(data.employee_email)
    admin_email = normalize_email(data.admin_email)
    new_status = "accepted" if data.accept else "rejected"

    connection = (
        supabase.table("connections")
        .select("*")
        .eq("employee_email", employee_email)
        .eq("admin_email", admin_email)
        .execute()
    )

    if not connection.data:
        raise HTTPException(status_code=404, detail="Connection request not found.")

    supabase.table("connections").update({
        "status": new_status
    }).eq("employee_email", employee_email).eq("admin_email", admin_email).execute()

    # Clean up the pending notifications for both parties regardless of outcome
    supabase.table("notifications").delete() \
        .in_("type", ["connection_request", "connection_pending"]) \
        .contains("metadata", {"employee_email": employee_email, "admin_email": admin_email}) \
        .execute()

    if not data.accept:
        # Notify the employee their request was rejected
        rejected_employee = (
            supabase.table("users")
            .select("*")
            .eq("email", employee_email)
            .execute()
        )
        if rejected_employee.data:
            emp_row = rejected_employee.data[0]
            supabase.table("notifications").insert({
                "user_id": emp_row["id"],
                "task_id": None,
                "type": "connection_rejected",
                "message": f"{admin_email} has declined your connection request.",
                "is_read": False,
                "metadata": {"employee_email": employee_email, "admin_email": admin_email},
            }).execute()
            token = emp_row.get("expo_push_token")
            send_push_notification(
                token,
                "Request Rejected",
                f"{admin_email} has declined your connection request.",
                data={"type": "connection_rejected", "employee_email": employee_email, "admin_email": admin_email},
            )

        return {"success": True, "message": "Request Rejected"}
    admin = (
        supabase.table("users")
        .select("*")
        .eq("email", admin_email)
        .execute()
    )
    admin = admin.data[0]

    workspace_id = admin.get("workspace_id")
    if not workspace_id:
        workspace = (
            supabase.table("workspaces")
            .insert({
                "name": f"{admin_email}'s Workspace",
                "owner_email": admin_email
            })
            .execute()
        )
        workspace_id = workspace.data[0]["id"]

        supabase.table("users").update({
            "workspace_id": workspace_id
        }).eq("email", admin_email).execute()

    employee = (
        supabase.table("users")
        .select("*")
        .eq("email", employee_email)
        .execute()
    )
    employee = employee.data[0]

    supabase.table("users").update({
        "workspace_id": workspace_id
    }).eq("email", employee_email).execute()

   # Notify the employee their request was accepted
    supabase.table("notifications").insert({
        "user_id": employee["id"],
        "task_id": None,
        "type": "connection_accepted",
        "message": f"{admin_email} has accepted your connection request.",
        "is_read": False,
        "metadata": {"employee_email": employee_email, "admin_email": admin_email},
    }).execute()

    employee_token = employee.get("expo_push_token")
    send_push_notification(
        employee_token,
        "Request Accepted",
        f"{admin_email} has accepted your connection request.",
        data={"type": "connection_accepted", "employee_email": employee_email, "admin_email": admin_email},
    )
    return {
        "success": True,
        "message": "Employee Connected Successfully",
        "workspace_id": workspace_id
    }
    
    
@app.get("/employee/connection-status/{employee_email}")
async def employee_connection_status(employee_email: str, current_user: dict = Depends(get_current_user)):

    employee_email = normalize_email(employee_email)

    request = (
        supabase.table("connections")
        .select("*")
        .eq("employee_email", employee_email)
        .order("id", desc=True)
        .limit(1)
        .execute()
    )

    if not request.data:
        return {
            "status": "not_found"
        }

    return {
        "status": request.data[0]["status"],
        "admin_email": request.data[0]["admin_email"]
    }

@app.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = (
        supabase.table("users")
        .select("*")
        .eq("email", current_user["sub"])
        .execute()
    )

    if not user.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")

    return user.data[0]
    
class RefreshRequest(BaseModel):
    refresh_token: str

@app.post("/refresh-token")
async def refresh_token_endpoint(data: RefreshRequest):
    token_hash = hash_token(data.refresh_token)

    row = (
        supabase.table("refresh_tokens")
        .select("*")
        .eq("token_hash", token_hash)
        .execute()
    )

    if not row.data:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    row = row.data[0]

    if row["revoked"]:
        # Reuse of a revoked token = possible theft. Nuke all sessions for this user.
        supabase.table("refresh_tokens").update({"revoked": True}) \
            .eq("user_email", row["user_email"]).execute()
        raise HTTPException(status_code=401, detail="Session invalid. Please login again.")

    if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired. Please login again.")

    user = (
        supabase.table("users")
        .select("*")
        .eq("email", row["user_email"])
        .execute()
    )
    if not user.data:
        raise HTTPException(status_code=404, detail="Account not found.")
    user = user.data[0]

    # Rotate: issue a new refresh token, revoke the old one
    new_refresh_token = create_refresh_token(user["email"])
    supabase.table("refresh_tokens").update({"revoked": True}) \
        .eq("token_hash", token_hash).execute()

    access_token = create_access_token(
        email=user["email"], role=user["role"], workspace_id=user.get("workspace_id")
    )

    return {
        "success": True,
        "token": access_token,
        "refresh_token": new_refresh_token,
    }
    
class DisconnectAdminRequest(BaseModel):
    employee_email: str

@app.post("/employee/disconnect-admin")
async def disconnect_admin(data: DisconnectAdminRequest, current_user: dict = Depends(get_current_user)):
    employee_email = normalize_email(data.employee_email)

    if current_user.get("sub") != employee_email:
        raise HTTPException(status_code=403, detail="You can only disconnect your own account.")

    employee = (
        supabase.table("users")
        .select("*")
        .eq("email", employee_email)
        .eq("role", "employee")
        .execute()
    )

    if not employee.data:
        raise HTTPException(status_code=404, detail="Employee account not found.")

    employee_row = employee.data[0]

    if not employee_row.get("workspace_id"):
        raise HTTPException(status_code=400, detail="You are not currently connected to any admin.")

    supabase.table("users").update({
        "workspace_id": None
    }).eq("email", employee_email).execute()

    supabase.table("connections").delete().eq("employee_email", employee_email).execute()

    return {
        "success": True,
        "message": "Disconnected from admin successfully."
    }

class LogoutRequest(BaseModel):
    refresh_token: str

@app.post("/logout")
async def logout(data: LogoutRequest):
    supabase.table("refresh_tokens").update({"revoked": True}) \
        .eq("token_hash", hash_token(data.refresh_token)).execute()
    return {"success": True, "message": "Logged out."}

@app.post("/admin/sync-sheet-tasks")
async def manual_sheet_sync(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can trigger sync.")
    result = sync_tasks_from_sheet()
    return result




from routes.excel_report import router as excel_report_router   
# from backend.routes.upload import router as upload_router    
app.include_router(excel_report_router)    
# app.include_router(upload_router)

from routes.pdf_report import router as pdf_report_router
app.include_router(pdf_report_router)

from routes.cloudinary_signature import router as cloudinary_signature_router
app.include_router(cloudinary_signature_router)