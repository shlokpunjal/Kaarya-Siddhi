-- Row Level Security: deny-by-default backstop for the anon/authenticated
-- Supabase roles, per the Path-1 decision (see project notes):
--
--   * All real data access goes through the FastAPI backend, which uses
--     the Supabase SERVICE ROLE key. The service role bypasses RLS
--     entirely, so none of this affects the backend.
--   * The mobile app also embeds the anon key directly (lib/supabase.ts)
--     to open Supabase Realtime channels. Enabling RLS with NO policies
--     for anon/authenticated means that key can no longer read or write
--     any table over the REST API even though it's compiled into the
--     app bundle — Realtime subscriptions are the one exception, and
--     they get their own narrowly-scoped read-only policies below.
--   * We do NOT rely on auth.uid() for anything except the Realtime
--     session specifically: /realtime-token issues a short-lived JWT
--     with sub = the user's own users.id, signed with the Supabase JWT
--     secret, and the client applies it via supabase.realtime.setAuth().
--     That's the ONE place auth.uid() actually resolves to anything —
--     the app has no other Supabase Auth session, so anywhere else
--     auth.uid() would just be NULL (which is exactly what we want:
--     NULL matches nothing, so it behaves as deny-by-default).
--
-- Run this once against the project's Postgres database (Supabase SQL
-- editor or `supabase db push`). Safe to re-run: policies are dropped
-- and recreated.

alter table public.users               enable row level security;
alter table public.tasks               enable row level security;
alter table public.workspaces          enable row level security;
alter table public.task_submissions    enable row level security;
alter table public.task_reviews        enable row level security;
alter table public.task_files          enable row level security;
alter table public.synced_sheet_tasks  enable row level security;
alter table public.refresh_tokens      enable row level security;
alter table public.otp_tokens          enable row level security;
alter table public.otp_sessions        enable row level security;
alter table public.notifications       enable row level security;
alter table public.employees           enable row level security;
<<<<<<< HEAD
alter table public."e-office"          enable row level security;
=======
alter table public."e - office"        enable row level security;
>>>>>>> origin/fix/security-review-findings
alter table public.connections         enable row level security;
alter table public.admins              enable row level security;
alter table public.extension_requests  enable row level security;

-- No policies are created for the tables above beyond what follows —
-- with RLS enabled and zero matching policies, anon/authenticated get
-- zero rows and zero writes. The backend's service-role key is
-- unaffected either way.

-- --------------------------------------------------------------------
-- Realtime exceptions: read-only, narrowly scoped to what the two
-- active subscriptions in app/_layout.tsx actually need.
-- --------------------------------------------------------------------

-- app/_layout.tsx subscribes to INSERT on notifications filtered to
-- the signed-in user's own id. Match that: a user can only ever read
-- (via Realtime) their own notification rows.
drop policy if exists "realtime read own notifications" on public.notifications;
create policy "realtime read own notifications"
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

<<<<<<< HEAD
-- FIX: the extension_requests policy below looks up the caller's own
-- workspace_id via a subquery on public.users. But public.users has
-- RLS enabled with NO policies (see top of file) — including for its
-- own subqueries, not just direct REST access. That meant the
-- subquery always returned zero rows for every caller, so
-- "workspace_id = (subquery)" was always NULL and never matched,
-- silently blocking every admin from ever receiving an
-- extension_requests Realtime event, regardless of workspace. This
-- policy is scoped exactly like the notifications one above (own row
-- only, via auth.uid()) so it doesn't open up any broader read access
-- through the anon-key-embedded REST API.
drop policy if exists "realtime read own user row" on public.users;
create policy "realtime read own user row"
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

=======
>>>>>>> origin/fix/security-review-findings
-- app/_layout.tsx subscribes to INSERT on extension_requests filtered
-- to the admin's own workspace_id. Match that: an admin can only read
-- (via Realtime) extension requests in their own workspace. This does
-- one extra lookup (users row for the caller) since workspace_id isn't
-- directly auth.uid() — that's fine for a SELECT policy.
drop policy if exists "realtime read own workspace extension requests" on public.extension_requests;
create policy "realtime read own workspace extension requests"
  on public.extension_requests
  for select
  to authenticated
  using (
    workspace_id = (
      select workspace_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );
