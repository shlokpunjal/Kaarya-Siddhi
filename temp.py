from dotenv import load_dotenv
load_dotenv()

import os
from b2sdk.v2 import B2Api, InMemoryAccountInfo

info = InMemoryAccountInfo()
b2_api = B2Api(info)

try:
    b2_api.authorize_account(
        "production",
        os.getenv("B2_KEY_ID"),
        os.getenv("B2_APPLICATION_KEY"),
    )
    print("AUTH SUCCESS")
except Exception as e:
    print("AUTH FAILED")
    print(e)