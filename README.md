# Kaarya Siddhi

A role-based task management mobile app built for field staff at Central Railway's Solapur Division. Designed to replace informal task tracking with a structured, mobile-first system that works for both administrators and field employees.

---

## What it does

**For Admins**
- Create and assign tasks to employees with priority, label, and deadline
- Track task status across the team — Overdue, Pending, In Review, Completed
- Leave suggestions/feedback on submitted tasks
- Generate filtered Excel and PDF reports by employee, label, priority, or date range
- View the full team's task calendar
- Manage employee connection requests (approve/reject employees joining their workspace)

**For Employees**
- View and manage your own assigned tasks
- Filter and sort tasks by status, priority, label, or deadline
- Mark tasks as complete or submit for review
- View your task calendar
- Request to connect with an admin's workspace, or disconnect from one

**Shared**
- OTP-based signup/login (no passwords)
- Push notifications for task deadlines and overdue items
- Light / Dark / System appearance modes, navy/saffron theme, Poppins typography

---

## Tech stack

| Layer               | Technology                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| Mobile frontend       | React Native 0.81 (Expo Router, Expo SDK 54)                              |
| Backend API           | FastAPI (Python)                                                           |
| Database              | Supabase (PostgreSQL)                                                     |
| Auth                  | Custom OTP + JWT — access token (30 min) + rotating refresh token (30 days), stored in SecureStore; role/workspace cached in AsyncStorage. Not Supabase Auth. |
| Report generation     | openpyxl (Excel), reportlab (PDF)                                          |
| Image uploads         | Cloudinary (signed uploads via backend-issued signature)                  |
| Scheduled jobs        | APScheduler (in-process) + pg_cron, with a cron-job.org fallback for Render's free-tier sleep |
| Rate limiting         | slowapi, per-IP, on unauthenticated auth endpoints                        |

---

## Auth flow

- Signup/login is OTP-based — no passwords stored anywhere.
- On success, the backend issues a short-lived **access token** (JWT, 30 min) and a long-lived **refresh token** (30 days, stored hashed in the `refresh_tokens` table).
- `authFetch` (see `utils/authFetch.ts`) attaches the access token to every request and transparently refreshes on a 401, sharing one in-flight refresh across concurrent requests so simultaneous screens don't each trigger their own refresh.
- Refresh tokens **rotate on every use**: the old one is marked `revoked`, a new one is issued. Reuse of an already-revoked token is treated as a signal of theft — every session for that user is revoked and the event is logged.
- `/logout` revokes the current refresh token server-side.
- `app/index.tsx` validates the stored token against `/me` on launch before routing into the admin or employee tab group.

---

## API surface (`backend/`)

| Route | Purpose |
| --- | --- |
| `POST /signup`, `/login`, `/send-otp`, `/verify-otp`, `/check-name` | OTP-based account creation and login |
| `POST /refresh-token`, `/logout` | Session management (see Auth flow above) |
| `POST /save-push-token` | Register a device for push notifications |
| `GET /me`, `DELETE /delete-account` | Current-user profile and account deletion |
| `POST /connect-request`, `/connection-respond`, `/employee/disconnect-admin` | Employee ↔ Admin workspace connections |
| `GET /connection-status/{employee_email}/{admin_email}`, `/admin/pending/{admin_email}`, `/employee/connection-status/{employee_email}` | Connection status lookups |
| `POST /admin/sync-sheet-tasks`, `/admin/send-deadline-reminders` | Admin-only manual triggers (role-checked) |
| `GET /reports/tasks/excel`, `/reports/tasks/pdf` | Filtered report generation |
| `GET /cloudinary/signature` | Signed upload credentials for the client |
| `POST /cron/send-deadline-reminders`, `/cron/send-overdue-reminders` | External-scheduler-only endpoints, guarded by a shared `X-Cron-Secret` header |
| `GET /health` | Liveness check |

Background jobs run on an in-process `BackgroundScheduler`: a sheet sync every 5 minutes, deadline reminders daily at 9:00 AM IST, and overdue reminders daily at 9:30 AM IST (all pinned to `Asia/Kolkata` explicitly, since the host server's local time may differ).

---

## Project structure

```
Kaarya-Siddhi/
├── app/
│   ├── (auth)/              # LoginChoice, clientLogin, employeeLogin, OTP screens
│   ├── (employee)/          # Employee tab group: Home, Tasks, Calendar, Profile
│   ├── (admin)/             # Admin tab group: Home, Tasks, Reports, Calendar, Profile
│   ├── reports/             # Report generation screens (genExcel, genPdf)
│   ├── _layout.tsx          # Root layout: font loading, ThemeProvider
│   └── index.tsx            # Entry point: validates session against /me, routes by role
├── backend/
│   ├── routes/
│   │   ├── auth.py               # Signup, login, OTP, refresh/logout
│   │   ├── users.py               # /me, delete-account
│   │   ├── connections.py         # Employee ↔ Admin workspace connections
│   │   ├── admin.py               # Admin-only manual triggers
│   │   ├── excel_report.py        # GET /reports/tasks/excel
│   │   ├── pdf_report.py          # GET /reports/tasks/pdf
│   │   └── cloudinary_signature.py
│   ├── main.py               # FastAPI entrypoint: CORS, rate limiting, scheduler, routers
│   ├── config.py             # Env-driven settings (JWT, CORS origins, cron secret, rate limits)
│   ├── auth_utils.py         # JWT create/decode, get_current_user dependency
│   ├── supabase_client.py    # Service-role Supabase client (bypasses RLS — backend-only)
│   ├── rate_limit.py         # Shared slowapi Limiter instance
│   ├── deadline_reminders.py / overdue_reminders.py   # Scheduled notification jobs
│   ├── sheets_sync.py        # Periodic sync job
│   └── requirements.txt
├── lib/
│   └── supabase.ts           # Client-side Supabase instance (anon key)
├── utils/
│   └── authFetch.ts          # Fetch wrapper: attaches JWT, handles refresh-on-401
├── constants/
│   └── api.ts                # API_BASE_URL — currently a hardcoded LAN IP, see note below
├── context/
│   └── ThemeContext.tsx      # Light / Dark / System theme provider with persistence
├── theme/
│   └── theme.ts              # Design tokens: colors, typography
├── database/
│   └── schema.sql            # Supabase table definitions
├── types/
│   ├── task.ts
│   └── user.ts
└── assets/
```

---

## Getting started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Expo Go app on your phone (Android or iOS)
- A Supabase project (URL + anon key + service role key)

### Frontend setup
```bash
git clone https://github.com/shlokpunjal/Kaarya-Siddhi.git
cd Kaarya-Siddhi
npm install
npx expo start
```
Scan the QR code with Expo Go.

**Before running:** set `constants/api.ts`'s `API_BASE_URL` to your backend's address. For local dev on a physical device, use your machine's LAN IP (same Wi-Fi network as the backend). This file is not currently environment-driven — swapping it for an `EXPO_PUBLIC_API_URL` env var is a known pre-production task (see Known limitations).

### Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # or `source venv/bin/activate` on Mac/Linux
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Create a `.env` in `backend/` with at minimum:
```
JWT_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
EXPO_PUBLIC_SUPABASE_URL=
CRON_SECRET=
FRONTEND_ORIGIN=       # optional, only needed for a browser-based surface
DEV_LAN_ORIGIN=        # optional, e.g. exp://192.168.x.x:8081
```
The app also expects `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the frontend's own `.env` for `lib/supabase.ts`.

---

## Known limitations

- **`API_BASE_URL` is hardcoded** to a LAN IP in `constants/api.ts` rather than sourced from an env var — fine for local dev, not usable once the backend is actually deployed.
- **No Row-Level Security policies** in `database/schema.sql`. The backend uses the Supabase service-role key (which bypasses RLS by design), so this only matters if any client-side code ever queries Supabase directly with the anon key.
- **No CI or automated tests** yet.
- `requirements.txt` versions are a starting pin, not a locked/tested set — re-freeze after a full local + staging run before deploying.

---

## Contributing

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before writing any code — it covers branching, PR conventions, shared file ownership, and the daily workflow.

Key rules at a glance:
- Never work directly on `main` — always branch off and open a PR
- Include `Closes #<issue-number>` in every PR description
- Don't edit `types/`, `theme/`, or `context/` without flagging it in the group chat first — everything imports from these

---

## Team

Built during a summer internship at **Central Railway, Solapur Division** under the Deputy Chief Engineer (Construction).

| Role          | Responsibility                                                   |
| ------------- | ------------------------------------------------------------------ |
| Person 1      | Authentication — OTP, login screens, session management           |
| Person 2      | Core workflow — task creation, assignment, dashboard              |
| Person 3      | Workflow extensions — extension requests, approval/rejection      |
| Person 4      | Backend architecture, Supabase schema, API endpoints              |
| Person 5 (PM) | Project management, UI/UX consistency, Excel/PDF reports          |
