import os
from dotenv import load_dotenv

load_dotenv()

# ---- JWT / Auth ----
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
REFRESH_TOKEN_DAYS = 30
ACCESS_TOKEN_MINUTES = 30

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set in .env — add it before starting the server.")

# ---- OTP ----
MAX_VERIFY_ATTEMPTS = 5
OTP_EXPIRY_MINUTES = 10
OTP_RESEND_SECONDS = 30
MAX_DAILY_ATTEMPTS = 3

# ---- CORS ----
ALLOWED_ORIGINS = [
    "http://localhost:8081",       # Expo web dev server (if you ever test on web)
    "http://localhost:19006",      # Expo web alt port
    "exp://192.168.31.88:8081",    # Expo Go on your LAN — replace with your actual dev IP
]