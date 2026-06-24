from fastapi import FastAPI
from routes.excel_report import router as excel_report_router

app = FastAPI()
app.include_router(excel_report_router)