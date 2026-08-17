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
_httpx_client = httpx.Client(http2=False, timeout=30)

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY,
    options=ClientOptions(httpx_client=_httpx_client),
)

# supabase-py's `create_client` is the SYNCHRONOUS client (blocking httpx
# under the hood). Every route in this app is `async def`, and calling a
# blocking client directly inside an async function blocks the entire
# event loop for that call's duration — so under concurrent load,
# requests queue up serially on every single DB round trip, even ones
# that have nothing to do with each other.
#
# `run_db()` is the fix that doesn't require rewriting the whole app onto
# an async Supabase client (a much larger, riskier migration): it runs a
# query builder's `.execute()` on FastAPI's thread pool instead of the
# event loop thread, so other requests can still be served while this
# one is waiting on the network. Usage in a route:
#
#   result = await run_db(supabase.table("tasks").select("*").eq("id", task_id))
#
# instead of:
#
#   result = supabase.table("tasks").select("*").eq("id", task_id).execute()
#
# Pass in the query builder (the chain of .table()/.select()/.eq()/...
# calls, everything up to but NOT including .execute()) — run_db calls
# .execute() for you, on the thread pool.
async def run_db(query):
    return await run_in_threadpool(query.execute)