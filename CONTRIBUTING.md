# Contributing to Kaarya Siddhi

5-day build, 5 people. This doc is the single source of truth for setup and workflow — read it before writing any code.

## Setup

```bash
git clone https://github.com/<org-or-username>/kaarya-siddhi.git
cd kaarya-siddhi
npm install
npx expo start
```

Scan the QR with Expo Go. You should land on the Employee dashboard (mock auth defaults to `role: 'employee'`). If this doesn't boot cleanly, stop and flag it before writing any feature code.

> Hit an `ERESOLVE` error on `npm install`?flag it in the group chat first so we diagnose the actual version conflict.

## Folder structure

```
app/
  (auth)/         clientLogin.tsx, employeeLogin.tsx, otp.tsx     — Person 1
  (employee)/     4-tab layout + screens                          — Person 2 / 3
  (admin)/        5-tab layout + screens (+ reports.tsx)          — Person 2 / 3
  _layout.tsx     root router: loads fonts, redirects by role     — DO NOT EDIT without flagging
  mockAuth.ts     temporary fake auth state, deleted once real auth lands

types/            Task, User shapes — shared contract
theme/            theme.ts (colors/fonts) + useTheme.ts — shared
data/             mockTasks.ts — fake data for UI dev before backend's ready
```

**`_layout.tsx`, `mockAuth.ts`, `types/`, and `theme/` are shared contracts.** Everything imports from them. If you need to change one, flag it in the group chat first — a silent change here can break someone else's screen without you knowing.

## Daily workflow

1. **Pull latest `main` before starting work each day:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create your branch** (never work directly on `main`):
   ```bash
   git checkout -b <yourname>/<short-feature-name>
   # e.g. git checkout -b person2/task-creation-ui
   ```

3. **Merge latest `main` into your branch** if it's been a while since you branched:
   ```bash
   git merge main
   ```

4. Do the work. Test locally via `npx expo start` before committing.

5. **Commit in small, clear chunks:**
   ```bash
   git add .
   git commit -m "Add task creation form UI"
   ```

6. **Push your branch:**
   ```bash
   git push origin <yourname>/<short-feature-name>
   ```

7. **Open a PR into `main`:**
   - Title: short, describes the change
   - Description: include `Closes #<issue-number>` so the linked issue auto-closes on merge
   - Request review (see below)

8. **Wait for at least one review before merging.** No self-merges, even under deadline pressure — a 2-minute review catches shared-file breakage early.

## Who reviews what

- **Anything touching `types/`, `theme/`, `mockAuth.ts`, or the auth contract** → Person 5 (PM)
- **Anything backend/schema-related** → Person 4
- **Everything else** → quick peer review from whoever's free

## PR ↔ Issue convention

Every PR that produces a code change should reference its issue:

```
Closes #12
```

in the PR description. On merge into `main`, this auto-closes the issue and moves it to Done on the Project board. Decision/coordination issues (no code output — e.g. "Finalize screen designs") get closed manually, no PR needed.

## If you're blocked

Say so immediately in the group chat — don't sit on a blocker hoping it resolves itself. With 5 days, a half-day of silent blocking is a real chunk of the timeline gone.