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
- 1:1 chat with connected employees

**For Employees**
- View and manage your own assigned tasks
- Filter and sort tasks by status, priority, label, or deadline
- Mark tasks as complete or submit for review
- View your task calendar
- Request to connect with an admin's workspace, or disconnect from one
- 1:1 chat with your connected admin

**Shared**
- OTP-based signup/login (no passwords)
- Push notifications for task deadlines and overdue items
- Real-time 1:1 chat (admin ↔ employee only, no employee-to-employee) — text, images, files, replies, reactions, typing indicators, delete-for-me/delete-for-everyone, clear chat
- Light / Dark / System appearance modes, navy/saffron theme, Poppins typography

---

## Tech stack

| Layer               | Technology                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| Mobile frontend       | React Native 0.81 (Expo Router, Expo SDK 54)                              |
| Backend API           | FastAPI (Python)                                                           |
| Database              | Supabase (PostgreSQL)                                                     |
| Realtime               | Supabase Realtime (chat messages, typing indicators, online status) — anon key on the client, scoped by narrow read-only RLS policies |
| Auth                  | Custom OTP + JWT — access token (30 min) + rotating refresh token (30 days), stored in SecureStore; role/workspace cached in AsyncStorage. Not Supabase Auth. |
| Report generation     | openpyxl (Excel), reportlab (PDF)                                          |
| Image/file uploads    | Cloudinary (signed uploads via backend-issued signature) — used for task attachments, avatars, and chat file/image messages |
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

## Chat

- Admin ↔ employee only — enforced server-side on every request in `backend/routes/chat.py` (same role, or not in the same `workspace_id` → blocked), not just at conversation creation.
- All data access (contacts list, messages, send, react, delete, clear) goes through the FastAPI backend using the Supabase **service role** key, per the same "backend owns access control" pattern the rest of the app uses.
- The one exception: Supabase **Realtime** subscriptions (new messages, typing indicators, online status) connect directly from the client with the **anon key**, via a short-lived token from `GET /realtime-token` (`backend/routes/realtime.py`), since Realtime can't be routed through the backend. These are locked down with narrowly-scoped, read-only RLS policies — see `database/rls_policies.sql`.
- Files/images sent in chat go to Cloudinary, same signed-upload flow as everywhere else; only the URL is stored in Postgres (`message_files`).
- **Known issue:** `hooks/chat/useConversation.ts` calls `fetchMessage()` (→ `GET /chat/messages/{message_id}`) to refresh a message after a Realtime UPDATE event (e.g. on a reaction or read receipt) — but that route doesn't currently exist in `backend/routes/chat.py`, so the call 404s silently and reactions/read-status don't live-refresh until the screen reloads. Needs a backend route added or the frontend call removed.

---

## API surface (`backend/`)

| Route | Purpose |
| --- | --- |
| `POST /signup`, `/login`, `/send-otp`, `/verify-otp`, `/check-name` | OTP-based account creation and login |
| `POST /refresh-token`, `/logout` | Session management (see Auth flow above) |
| `POST /save-push-token` | Register a device for push notifications |
| `GET /me`, `DELETE /delete-account` | Current-user profile and account deletion |
| `GET /realtime-token` | Short-lived JWT for the client to authenticate Supabase Realtime channels |
| `POST /connect-request`, `/connection-respond`, `/employee/disconnect-admin` | Employee ↔ Admin workspace connections |
| `GET /connection-status/{employee_email}/{admin_email}`, `/admin/pending/{admin_email}`, `/employee/connection-status/{employee_email}` | Connection status lookups |
| `POST /admin/sync-sheet-tasks`, `/admin/send-deadline-reminders` | Admin-only manual triggers (role-checked) |
| `GET /chat/contacts` | Chat contacts list (with last-message preview + unread count) |
| `GET /chat/conversation/{other_email}`, `POST /chat/conversation/{other_email}/read` | Fetch a conversation's messages (paginated), mark it read |
| `POST /chat/send` | Send a message (text/image/file/video/audio, optional reply) |
| `POST /chat/messages/{message_id}/react` | React to a message (upsert: same emoji again = remove) |
| `DELETE /chat/messages/{message_id}` | Delete for everyone (sender only) |
| `POST /chat/messages/{message_id}/delete-for-me` | Delete for me only |
| `POST /chat/clear` | Clear a chat thread (for me only) |
| `GET /reports/tasks/excel`, `/reports/tasks/pdf` | Filtered report generation |
| `GET /cloudinary/signature` | Signed upload credentials for the client |
| `POST /cron/send-deadline-reminders`, `/cron/send-overdue-reminders` | External-scheduler-only endpoints, guarded by a shared `X-Cron-Secret` header |
| `GET /health` | Liveness check |

This table is a curated subset (as in the original doc), not an exhaustive route list — task CRUD (`/tasks`, `/dashboard-counts`, `/calendar-tasks`, etc.), `/eoffice`, `/task-labels`, `/extension-requests`, and `/notifications` routes also exist under `backend/routes/` but aren't itemized here.

Background jobs run on an in-process `BackgroundScheduler`: a sheet sync every 5 minutes, deadline reminders daily at 9:00 AM IST, and overdue reminders daily at 9:30 AM IST (all pinned to `Asia/Kolkata` explicitly, since the host server's local time may differ). Reminder delivery itself (deadline/overdue/eoffice) now runs in Postgres via `pg_cron` — see `database/reminders_pg_cron.sql` and `database/eoffice_cleanup_pg_cron.sql` — not as Python cron jobs.

---

## Project structure

Kaarya-Siddhi/
├── app/
│ ├── (auth)/ # LoginChoice, clientLogin, employeeLogin, OTP screens
│ ├── (employee)/ # Employee tab group: Home, Tasks, Calendar, Profile
│ ├── (admin)/ # Admin tab group: Home, Tasks, Reports, Calendar, Profile
│ ├── (chat)/ # Chat contacts list + conversation screen
│ ├── (task)/ # Task detail, new task, extend deadline
│ ├── reports/ # Report generation screens (genExcel, genPdf, pdfViewer)
│ ├── _layout.tsx # Root layout: font loading, ThemeProvider, notification bridge
│ └── index.tsx # Entry point: validates session against /me, routes by role
├── backend/
│ ├── routes/
│ │ ├── auth.py # Signup, login, OTP, refresh/logout
│ │ ├── users.py # /me, delete-account, profile, team, connection-status
│ │ ├── connections.py # Employee ↔ Admin workspace connections
│ │ ├── admin_route.py # Admin-only manual triggers
│ │ ├── realtime.py # /realtime-token for Supabase Realtime auth
│ │ ├── chat.py # Chat: contacts, conversation, send, react, delete, clear
│ │ ├── tasks.py # Task listing, dashboard counts, calendar, admin overview
│ │ ├── employee_tasks.py # Task CRUD, self-assign, file uploads, ask-for-review
│ │ ├── extensions.py # Deadline extension requests
│ │ ├── task_labels.py # Custom task labels
│ │ ├── notify.py # In-app notifications
│ │ ├── eoffice.py # e-office file tracking
│ │ ├── excel_report.py # GET /reports/tasks/excel
│ │ ├── pdf_report.py # GET /reports/tasks/pdf
│ │ └── cloudinary_signature.py
│ ├── main.py # FastAPI entrypoint: CORS, rate limiting, scheduler, routers
│ ├── config.py # Env-driven settings (JWT, CORS origins, cron secret, rate limits)
│ ├── auth_utils.py # JWT create/decode, get_current_user dependency
│ ├── supabase_client.py # Service-role Supabase client (bypasses RLS — backend-only)
│ ├── rate_limit.py # Shared slowapi Limiter instance
│ ├── notify_utils.py # Single source of truth for creating/pushing notifications
│ ├── sheets_sync.py # Periodic sync job
│ └── requirements.txt
├── components/
│ └── chat/ # ChatFab, ChatInputBar, ChatAvatar
├── hooks/
│ └── chat/ # useChatContacts, useConversation (Realtime + REST)
├── services/
│ ├── chatApi.ts # Chat REST calls (via authFetch)
│ └── chatRealtime.ts # Supabase Realtime channel helpers for chat
├── lib/
│ └── supabase.ts # Client-side Supabase instance (anon key)
├── utils/
│ ├── authFetch.ts # Fetch wrapper: attaches JWT, handles refresh-on-401
│ └── chatTime.ts # Chat timestamp formatting
├── constants/
│ └── api.ts # API_BASE_URL
├── context/
│ └── ThemeContext.tsx # Light / Dark / System theme provider with persistence
├── theme/
│ └── theme.ts # Design tokens: colors, typography
├── database/
│ ├── schema.sql # Full table definitions (core + chat)
│ ├── rls_policies.sql # RLS: deny-by-default backstop + Realtime read policies
│ ├── chat_schema.sql # Chat tables (now folded into schema.sql)
│ ├── message_deletions.sql # "Delete for me" table (now folded into schema.sql)
│ ├── reminders_pg_cron.sql # Deadline/overdue reminder cron jobs
│ ├── eoffice_cleanup_pg_cron.sql # e-office record cleanup cron job
│ └── task_suggestion_and_cleanup_pg_cron.sql
├── types/
│ ├── task.ts
│ ├── user.ts
│ └── chat.ts
└── assets/


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

**Before running:** set `constants/api.ts`'s `API_BASE_URL` to your backend's address. For local dev on a physical device, use your machine's LAN IP (same Wi-Fi network as the backend). This file is not currently environment-driven — swapping it for an `EXPO_PUBLIC_API_URL` env var is a known pre-production task.

### Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # or `source venv/bin/activate` on Mac/Linux
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Create a `.env` in `backend/` with at minimum:
JWT_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
EXPO_PUBLIC_SUPABASE_URL=
CRON_SECRET=
FRONTEND_ORIGIN= # optional, only needed for a browser-based surface
DEV_LAN_ORIGIN= # optional, e.g. exp://192.168.x.x:8081

The app also expects `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the frontend's own `.env` for `lib/supabase.ts`.

### Database setup
Run `database/schema.sql` in the Supabase SQL editor, then `database/rls_policies.sql`. The pg_cron files (`reminders_pg_cron.sql`, `eoffice_cleanup_pg_cron.sql`, `task_suggestion_and_cleanup_pg_cron.sql`) are optional — only needed if you want reminders/cleanup running inside Postgres rather than relying solely on the in-process scheduler.

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
| Prathamesh Amone      | Authentication — OTP, login screens,  API endpoints          |
| Maheshwari Raccha      | Core workflow — task creation, assignment, dashboard              |
| Mugdha Vyavhare      | Workflow extensions — extension requests, approval/rejection      |
| Kartik Gundla     | Backend architecture, Supabase schema, session management              |
| Shlok Punjal | Project management, UI/UX consistency, Excel/PDF reports, eOffice          |