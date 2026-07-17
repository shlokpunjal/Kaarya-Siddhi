# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from apscheduler.schedulers.background import BackgroundScheduler

from config import ALLOWED_ORIGINS
from sheets_sync import sync_tasks_from_sheet

from routes.auth import router as auth_router
from routes.connections import router as connections_router
from routes.users import router as users_router
from routes.admin import router as admin_router
from routes.excel_report import router as excel_report_router
from routes.pdf_report import router as pdf_report_router
from routes.cloudinary_signature import router as cloudinary_signature_router

app = FastAPI(title="Kaarya Siddhi API")

# Background job: pull tasks from the linked Google Sheet every 5 minutes
scheduler = BackgroundScheduler()
scheduler.add_job(sync_tasks_from_sheet, "interval", minutes=5)
scheduler.start()

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
    print(f"UNHANDLED ERROR on {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on our end. Please try again."})


app.include_router(auth_router)
app.include_router(connections_router)
app.include_router(users_router)
app.include_router(admin_router)
app.include_router(excel_report_router)
app.include_router(pdf_report_router)
app.include_router(cloudinary_signature_router)