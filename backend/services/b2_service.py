from dotenv import load_dotenv
from b2sdk.v2 import B2Api, InMemoryAccountInfo
import os

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