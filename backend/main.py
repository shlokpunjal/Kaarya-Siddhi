from fastapi import FastAPI
from routes.reports import router as reports_router

app = FastAPI()
app.include_router(reports_router)