# App entrypoint only. Every route now lives in routes/ — this file just
# wires up FastAPI, CORS, rate limiting, the background scheduler, and
# global exception handling.
import logging
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
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
from overdue_reminders import send_overdue_reminders
from routes.tasks import router as tasks_router
from eoffice_reminders import send_eoffice_reminders
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

@app.post("/cron/send-deadline-reminders")
async def cron_deadline_reminders(background_tasks: BackgroundTasks, x_cron_secret: str = Header(None)):
    # Called by an external scheduler (cron-job.org) since Render's free
    # tier can put the app to sleep, making an in-process APScheduler
    # cron unreliable. Secret-header auth instead of a user JWT, since a
    # cron pinger can't maintain a login session.
    #
    # The actual reminder work runs as a BackgroundTask so this endpoint
    # can ack (200 OK) immediately after the request wakes/reaches the
    # instance, instead of making the cron scheduler wait out the full
    # notification fan-out (DB queries + Expo push calls) on top of a
    # possible cold start. That fan-out is what previously made this
    # endpoint slow enough to trip cron-job.org's timeout.
    if not CRON_SECRET or x_cron_secret != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Invalid cron secret.")
    background_tasks.add_task(send_deadline_reminders)
    return {"success": True, "status": "queued"}

@app.post("/cron/send-overdue-reminders")
async def cron_overdue_reminders(background_tasks: BackgroundTasks, x_cron_secret: str = Header(None)):
    # Same external-scheduler + fast-ack pattern as /cron/send-deadline-reminders.
    if not CRON_SECRET or x_cron_secret != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Invalid cron secret.")
    background_tasks.add_task(send_overdue_reminders)
    return {"success": True, "status": "queued"}

@app.post("/cron/send-eoffice-reminders")
async def cron_eoffice_reminders(background_tasks: BackgroundTasks, x_cron_secret: str = Header(None)):
    if not CRON_SECRET or x_cron_secret != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Invalid cron secret.")
    background_tasks.add_task(send_eoffice_reminders)
    return {"success": True, "status": "queued"}

# ---- Background jobs ----
# NOTE: the deadline/overdue/eoffice reminders are intentionally NOT
# scheduled here. They used to be scheduled both here (in-process,
# BackgroundScheduler) AND externally via cron-job.org hitting the
# /cron/... routes above. Whenever the instance happened to be awake at
# 9:00/9:30/17:00 IST, both fired and the job ran twice in the same
# window. The external cron is the one that actually works reliably on
# a free-tier instance that sleeps (that's why it was added in the first
# place — see the route comments above), so it's now the ONLY trigger
# for these three jobs. Only the sheet sync — which has nothing external
# driving it — stays on the in-process scheduler.
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