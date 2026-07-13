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

**For Employees**
- View and manage your own assigned tasks
- Filter and sort tasks by status, priority, label, or deadline
- Mark tasks as complete or submit for review
- View your task calendar

Both roles share a consistent UI with a navy/saffron theme, Poppins typography, and support for Light, Dark, and System appearance modes.

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile frontend | React Native (Expo Router) |
| Backend API | FastAPI (Python) |
| Database | Supabase (PostgreSQL) |
| Auth | Firebase (OTP via email/phone) |
| Report generation | openpyxl (Excel), PDF (in progress) |

---

## Project structure

```
Kaarya-Siddhi/
├── app/
│   ├── (auth)/             # Login screens — clientLogin, employeeLogin, otp
│   ├── (employee)/         # Employee tab group: Home, Tasks, Calendar, Profile
│   ├── (admin)/            # Admin tab group: Home, Tasks, Reports, Calendar, Profile
│   ├── reports/            # Report generation screens (genExcel, genPdf)
│   ├── _layout.tsx         # Root layout: font loading, ThemeProvider
│   └── index.tsx           # Entry point: redirects based on auth + role
├── backend/
│   ├── routes/
│   │   ├── excel_report.py # GET /reports/tasks/excel 
│   │   └── pdf_report.py   # GET /reports/tasks/pdf 
│   ├── main.py             # FastAPI app entry
│   └── requirements.txt
├── context/
│   └── ThemeContext.tsx    # Theme provider: Light / Dark / System with persistence
├── theme/
│   └── theme.ts            # Design tokens: colors, typography, lightTheme, darkTheme
├── types/
│   ├── task.ts             # Task, TaskStatus, TaskPriority types
│   └── user.ts             # User, Role types
└── assets/
    └── icons/              # Tab bar icons (filled + outline per tab)
```

---

## Getting started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Expo Go app on your phone (Android or iOS)

### Frontend setup

```bash
git clone https://github.com/shlokpunjal/Kaarya-Siddhi.git
cd Kaarya-Siddhi
npm install
npx expo start
```

Scan the QR code with Expo Go. The app will load the Employee or Admin view based on the current `mockAuth` state in `app/index.tsx` (temporary — real auth replaces this once login is complete).

### Backend setup

```bash
cd backend
python -m pip install fastapi uvicorn python-dotenv supabase pydantic
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload 
```

> **Note:** When testing on a physical device via Expo Go, replace `localhost` with your machine's LAN IP address (run `ipconfig` on Windows / `ifconfig` on Mac). Both devices must be on the same Wi-Fi network.

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

| Role | Responsibility |
|---|---|
| Person 1 | Authentication — Firebase OTP, login screens, session management |
| Person 2 | Core workflow — task creation, assignment, dashboard |
| Person 3 | Workflow extensions — extension requests, approval/rejection |
| Person 4 | Backend architecture, Supabase schema, API endpoints |
| Person 5 (PM) | Project management, UI/UX consistency, Excel reports |

