from fastapi import FastAPI
# from routes.excel_report import router as excel_report_router
# from routes.upload import router as upload_router
from backend.routes.excel_report import router as excel_report_router
from backend.routes.upload import router as upload_router
app = FastAPI()
app.include_router(excel_report_router)
app.include_router(upload_router)