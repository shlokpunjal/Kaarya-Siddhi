# backend/main.py
#
# App entrypoint only. Every route now lives in routes/ — this file just
# wires up FastAPI, CORS, rate limiting, the background scheduler, and
# global exception handling.
import logging
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware # enables data sharing by the backend to frontend on various domains
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException # used to show errors when they occur (shown by code like 404 not found)
from apscheduler.schedulers.background import BackgroundScheduler
from slowapi.errors import RateLimitExceeded # sets limits to use of api 
from slowapi import _rate_limit_exceeded_handler # avoids spams and too many requests
from config import ALLOWED_ORIGINS, CRON_SECRET
from rate_limit import limiter
from sheets_sync import sync_tasks_from_sheet
from deadline_reminders import send_deadline_reminders

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kaarya_siddhi")

app = FastAPI(title="Kaarya Siddhi API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(status_code=422, content={"detail": "Invalid request data. Please check your input."})

@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    logger.exception(f"UNHANDLED ERROR on {request.url.path}")
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on our end. Please try again."})

@app.post("/cron/send-deadline-reminders")
async def cron_deadline_reminders(x_cron_secret: str = Header(None)):
    # Called by an external scheduler (cron-job.org) since Render's free
    # tier can put the app to sleep, making the in-process APScheduler
    # cron above unreliable. Secret-header auth instead of a user JWT,
    # since a cron pinger can't maintain a login session.
    if not CRON_SECRET or x_cron_secret != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Invalid cron secret.")
    result = send_deadline_reminders()
    return result

# ---- Background jobs ----
scheduler = BackgroundScheduler()
scheduler.add_job(sync_tasks_from_sheet, "interval", minutes=5)
# Runs once a day at 9:00 AM IST — well within business hours, and early
# enough that a task due tomorrow still gives the employee a full day's
# notice. Timezone is pinned explicitly since the server host's local
# time may not be IST.
scheduler.add_job(send_deadline_reminders, "cron", hour=9, minute=0, timezone="Asia/Kolkata")
scheduler.start()

# ---- Routers ----
from routes.auth import router as auth_router
from routes.connections import router as connections_router
from routes.admin import router as admin_router
from routes.users import router as users_router
from routes.excel_report import router as excel_report_router
from routes.pdf_report import router as pdf_report_router
from routes.cloudinary_signature import router as cloudinary_signature_router

app.include_router(auth_router)
app.include_router(connections_router)
app.include_router(admin_router)
app.include_router(users_router)
app.include_router(excel_report_router)
app.include_router(pdf_report_router)
app.include_router(cloudinary_signature_router)