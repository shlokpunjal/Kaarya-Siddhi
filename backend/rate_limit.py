# backend/rate_limit.py
#
# Single shared Limiter instance so main.py and every router use the same
# state. Keyed by client IP — good enough to blunt scripted brute-force
# and enumeration attempts against unauthenticated endpoints. This is on
# top of, not instead of, the existing per-email OTP throttling in
# routes/auth.py (that one stops abuse of a single account; this one
# stops abuse from a single source across many accounts).

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
