from dotenv import load_dotenv
from b2sdk.v2 import B2Api, InMemoryAccountInfo
import os
import uuid

load_dotenv()

info = InMemoryAccountInfo()
b2_api = B2Api(info)

b2_api.authorize_account(
    "production",
    os.getenv("B2_KEY_ID"),
    os.getenv("B2_APPLICATION_KEY"),
)

bucket = b2_api.get_bucket_by_name(
    os.getenv("B2_BUCKET_NAME")
)

def upload_file_to_b2(file_bytes: bytes, filename: str):
    unique_filename = f"tasks/{uuid.uuid4()}_{filename}"

    bucket.upload_bytes(
        file_bytes,
        unique_filename
    )

    # Correct way to build download URL in b2sdk.v2
    base_url = b2_api.get_download_url_for_filenames(
        os.getenv("B2_BUCKET_NAME")
    )
    full_url = f"{base_url}/{unique_filename}"

    return full_url