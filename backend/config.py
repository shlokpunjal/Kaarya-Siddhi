import os
from dotenv import load_dotenv

load_dotenv()

# ---- JWT / Auth ----
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
REFRESH_TOKEN_DAYS = 30
ACCESS_TOKEN_MINUTES = 30

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set in .env — add it before starting the server.")

# ---- Cron ----
# Shared secret for the external scheduler (cron-job.org) that pings
# /cron/send-deadline-reminders. Render's free tier can sleep, so this
# endpoint uses a static secret header instead of a user JWT — a cron
# pinger can't maintain a login session. Set CRON_SECRET in Render's
# environment config.
CRON_SECRET = os.getenv("CRON_SECRET")
# ---- OTP ----
MAX_VERIFY_ATTEMPTS = 5
OTP_EXPIRY_MINUTES = 10
OTP_RESEND_SECONDS = 30
MAX_DAILY_ATTEMPTS = 3

# ---- CORS ----
# Local dev origins never change, so they're hardcoded. The production
# origin comes from an env var instead of being baked into source — set
# FRONTEND_ORIGIN in Render's environment config once you have a real
# deployed web/admin origin (a plain Expo Go / built APK client doesn't
# send an Origin header at all, so this only matters if you ever add a
# browser-based surface).
_DEV_ORIGINS = [
    "http://localhost:8081",   # Expo web dev server
    "http://localhost:19006",  # Expo web alt port
]

_prod_origin = os.getenv("FRONTEND_ORIGIN")
_dev_lan_origin = os.getenv("DEV_LAN_ORIGIN")  # e.g. exp://192.168.x.x:8081, set locally in your own .env, never committed

ALLOWED_ORIGINS = _DEV_ORIGINS + [o for o in (_prod_origin, _dev_lan_origin) if o]

# ---- Rate limiting ----
# Applied per-IP on auth endpoints that are otherwise unauthenticated
# (signup, login, send-otp, verify-otp, check-name) to blunt brute-force
# and account-enumeration attempts. See rate_limit.py.
AUTH_RATE_LIMIT = "5/minute"
LOOKUP_RATE_LIMIT = "15/minute"  # for read-only checks like check-name
