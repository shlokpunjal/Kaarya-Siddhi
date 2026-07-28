# App entrypoint only. Every route now lives in routes/ — this file just
# wires up FastAPI, CORS, rate limiting, the background scheduler, and
# global exception handling.
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # enables data sharing by the backend to frontend on various domains
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException # used to show errors when they occur (shown by code like 404 not found)
from apscheduler.schedulers.background import BackgroundScheduler
from slowapi.errors import RateLimitExceeded # sets limits to use of api 
from slowapi import _rate_limit_exceeded_handler # avoids spams and too many requests
from config import ALLOWED_ORIGINS
from rate_limit import limiter
from sheets_sync import sync_tasks_from_sheet
from routes.tasks import router as tasks_router
from routes.employee_tasks import router as employee_tasks_router
from routes.eoffice import router as eoffice_router
from routes.notify import router as notify_router
from routes.extension import router as extensions_router
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kaarya_siddhi")

app = FastAPI(title="Kaarya Siddhi API")
app.state.limiter = limiter
app.include_router(notify_router)
app.include_router(eoffice_router)
app.include_router(employee_tasks_router)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.include_router(tasks_router)
app.include_router(extensions_router)
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

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# ---- Background jobs ----
# NOTE: the deadline/overdue/eoffice reminders are NOT scheduled here,
# have no HTTP routes, and have no Python implementation at all anymore
# (backend/deadline_reminders.py, overdue_reminders.py, eoffice_reminders.py,
# cron_runner.py were all deleted). That logic now lives entirely inside
# Supabase's Postgres — see database/reminders_pg_cron.sql — scheduled by
# pg_cron and sent via pg_net's async net.http_post() straight to Expo's
# push API. Nothing about this app server being awake, asleep, or cold-
# starting affects those jobs at all anymore. Only the sheet sync — which
# has nothing external driving it and needs to run every 5 minutes while
# this service happens to be up — stays on the in-process scheduler.
scheduler = BackgroundScheduler()
scheduler.add_job(sync_tasks_from_sheet, "interval", minutes=5)
scheduler.start()

# ---- Routers ----
from routes.auth import router as auth_router
from routes.connections import router as connections_router
from routes.admin import router as admin_router
from routes.users import router as users_router
from routes.excel_report import router as excel_report_router
from routes.pdf_report import router as pdf_report_router
from routes.cloudinary_signature import router as cloudinary_signature_router
from routes.realtime import router as realtime_router
app.include_router(realtime_router)
app.include_router(auth_router)
app.include_router(connections_router)
app.include_router(admin_router)
app.include_router(users_router)
app.include_router(excel_report_router)
app.include_router(pdf_report_router)
app.include_router(cloudinary_signature_router)