from fastapi import APIRouter, UploadFile, File
from backend.services.b2_service import upload_file_to_b2

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()

    file_url = upload_file_to_b2(
        contents,
        file.filename
    )

    return {
        "success": True,
        "file_url": file_url,       # ← renamed
        "file_name": file.filename,
        "file_type": file.content_type
    }