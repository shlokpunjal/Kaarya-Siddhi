from supabase import create_client, ClientOptions
from dotenv import load_dotenv
from starlette.concurrency import run_in_threadpool
import os
import httpx

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.getenv("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_KEY is not set — backend needs this to bypass RLS.")

# Force HTTP/1.1 — avoids intermittent HTTP/2 StreamReset errors between
# Render and Supabase's Cloudflare-fronted edge (RemoteProtocolError).
# Safe here: this backend only uses supabase.table() (PostgREST), so the
# known issue with shared httpx_client + multiple Supabase services
# (storage/auth base_url clobbering) doesn't apply.
_httpx_client = httpx.Client(http2=False, timeout=30)

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY,
    options=ClientOptions(httpx_client=_httpx_client),
)

async def run_db(query):
    return await run_in_threadpool(query.execute)