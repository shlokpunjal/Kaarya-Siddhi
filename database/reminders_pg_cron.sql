-- database/reminders_pg_cron.sql
--
-- Replaces the 3 Render Cron Jobs (deadline/overdue/eoffice reminders)
-- with native Supabase jobs, matching the pattern your
-- "delete-completed-eoffice-files" / "delete-old-completed-tasks" jobs
-- already use (cron.schedule(...), visible under Database > Cron Jobs).
--
-- WHY THIS IS BETTER THAN THE RENDER CRON JOB APPROACH:
-- Runs entirely inside Supabase's Postgres via pg_cron + pg_net — no
-- web service, no cold start, nothing that can be asleep. net.http_post()
-- is async/non-blocking, so the job fires the Expo push request and
-- returns immediately regardless of Expo's response time.
--
-- HARDENING APPLIED (read before running):
--   1. safe_uuid() — tasks.assigned_to / created_by are TEXT, not UUID.
--      A single malformed value would otherwise make ::uuid throw and
--      abort the WHOLE run for every task that day. safe_uuid() returns
--      NULL instead, so a bad row is just silently skipped — same
--      behavior as the Python version's dict.get() lookups.
--   2. REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated — Supabase's
--      PostgREST auto-exposes every public-schema function as a callable
--      HTTP endpoint (/rest/v1/rpc/<name>) and grants EXECUTE to anon/
--      authenticated by default. Without this revoke, anyone holding
--      your app's public anon key could call these repeatedly over HTTP
--      and spam real users with push notifications (the eoffice job has
--      no "already sent" guard by design, so it's the most exposed).
--   3. Chunked pushes — Expo's push API rejects a single request with
--      more than 100 messages. The Python version already chunks; this
--      SQL now does too, so a big batch can't silently fail outright.
--   4. notifications_enabled — every job writes the `notifications` row
--      for EVERY eligible user regardless of this setting (so it still
--      shows on their in-app notifications page). It only gates whether
--      a push (and therefore an OS tray banner) actually goes out.
--
-- SETUP (run once, in Supabase SQL Editor):
--   1. create extension if not exists pg_net with schema extensions;
--      (no-op if already enabled — check Database > Extensions)
--   2. Run this whole file once.
--   3. Test manually before trusting the schedule:
--        select send_deadline_reminders();
--        select send_overdue_reminders();
--        select send_eoffice_reminders();
--      Check the `notifications` table and that a push actually arrived.
--   4. Check run history any time the same way you'd check Render's
--      "History" button:
--        select jobname, status, return_message, start_time, end_time
--        from cron.job_run_details jrd
--        join cron.job j on j.jobid = jrd.jobid
--        where j.jobname in ('send-deadline-reminders','send-overdue-reminders','send-eoffice-reminders')
--        order by start_time desc limit 20;
--
-- AFTER THIS IS VERIFIED WORKING:
--   - Delete the 3 old Render Cron Jobs + "Warm-up Ping" (nothing needs
--     the web service kept awake for these anymore).
--   - backend/deadline_reminders.py, overdue_reminders.py,
--     eoffice_reminders.py, cron_runner.py become dead code — keep as a
--     manual fallback or delete, your call.

-- ============================================================
-- 0. Helper: cast text to uuid without ever throwing
-- ============================================================
create or replace function safe_uuid(input text) returns uuid
language plpgsql
immutable
as $$
begin
  return input::uuid;
exception when others then
  return null;
end;
$$;

-- ============================================================
-- 1. DEADLINE REMINDERS — daily 9:00 AM IST (03:30 UTC)
-- ============================================================
create or replace function send_deadline_reminders() returns void
language plpgsql
as $$
declare
  target_date date := ((now() at time zone 'Asia/Kolkata')::date) + 1;
  msgs jsonb[];
  i int;
begin
  with eligible as (
    select t.id as task_id, t.title, t.deadline,
           u.id as user_id, u.expo_push_token, u.notifications_enabled
    from tasks t
    join users u on u.id = safe_uuid(t.assigned_to)
    where t.deadline::date = target_date
      and t.status <> 'completed'
      and t.deadline_reminder_sent = false
  ),
  inserted as (
    insert into notifications (user_id, task_id, type, message, is_read, metadata)
    select user_id, task_id, 'deadline',
           'Your task "' || title || '" is due tomorrow.',
           false,
           jsonb_build_object('deadline', deadline)
    from eligible
    returning user_id, task_id, message
  )
  select array_agg(
    jsonb_build_object(
      'to', e.expo_push_token,
      'title', 'Task due tomorrow',
      'body', i.message,
      'sound', 'default',
      'data', jsonb_build_object('type', 'deadline', 'taskId', i.task_id)
    )
  )
  into msgs
  from inserted i
  join eligible e on e.task_id = i.task_id and e.user_id = i.user_id
  -- notifications row above is written for every eligible user
  -- regardless; this only gates whether a push goes out.
  where e.expo_push_token is not null
    and coalesce(e.notifications_enabled, true) = true;

  if msgs is not null then
    for i in 1 .. array_length(msgs, 1) by 100 loop
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := to_jsonb(msgs[i : least(i + 99, array_length(msgs, 1))]),
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
    end loop;
  end if;

  update tasks
  set deadline_reminder_sent = true
  where deadline::date = target_date
    and status <> 'completed'
    and deadline_reminder_sent = false;
end;
$$;

revoke execute on function send_deadline_reminders() from public, anon, authenticated;

select cron.schedule(
  'send-deadline-reminders',
  '30 3 * * *',
  $$select send_deadline_reminders();$$
);


-- ============================================================
-- 2. OVERDUE REMINDERS — daily 9:20 AM IST (03:50 UTC)
--    Notifies BOTH the task creator (admin) and the assignee
--    (employee). For self-created tasks (creator == assignee, e.g.
--    via /tasks/self) this sends exactly ONE notification, not two —
--    that's why the "assigned employee" branch below is excluded
--    whenever assigned_to = created_by.
-- ============================================================
create or replace function send_overdue_reminders() returns void
language plpgsql
as $$
declare
  today date := (now() at time zone 'Asia/Kolkata')::date;
  msgs jsonb[];
  i int;
begin
  with eligible as (
    select t.id as task_id, t.title, t.deadline, t.created_by, t.assigned_to
    from tasks t
    where t.deadline::date < today
      and t.status not in ('completed', 'in_review')
      and (t.last_overdue_notified_date is null or t.last_overdue_notified_date <> today)
  ),
  recipients as (
    -- Admin / creator: "<employee>'s task is overdue"
    select e.task_id, e.deadline,
           admin_row.id as user_id, admin_row.expo_push_token as push_token,
           admin_row.notifications_enabled as notifications_enabled,
           coalesce(emp.name, 'An employee') || '''s task "' || e.title ||
             '" is overdue (was due ' || (e.deadline::date)::text || ').' as message
    from eligible e
    join users admin_row on admin_row.id = safe_uuid(e.created_by)
    left join users emp on emp.id = safe_uuid(e.assigned_to)

    union all

    -- Assigned employee: "Your task is overdue" — skipped when the
    -- employee IS the creator (self-task), so they only get the one
    -- notification above instead of two identical-looking ones.
    select e.task_id, e.deadline,
           emp2.id as user_id, emp2.expo_push_token as push_token,
           emp2.notifications_enabled as notifications_enabled,
           'Your task "' || e.title || '" is overdue (was due ' || (e.deadline::date)::text || ').' as message
    from eligible e
    join users emp2 on emp2.id = safe_uuid(e.assigned_to)
    where safe_uuid(e.assigned_to) is distinct from safe_uuid(e.created_by)
  ),
  inserted as (
    insert into notifications (user_id, task_id, type, message, is_read, metadata)
    select user_id, task_id, 'overdue', message, false, jsonb_build_object('deadline', deadline)
    from recipients
    returning user_id, task_id, message
  )
  select array_agg(
    jsonb_build_object(
      'to', r.push_token,
      'title', 'Task overdue',
      'body', i.message,
      'sound', 'default',
      'data', jsonb_build_object('type', 'overdue', 'taskId', i.task_id)
    )
  )
  into msgs
  from inserted i
  join recipients r on r.task_id = i.task_id and r.user_id = i.user_id
  -- notifications row above is written for every recipient regardless;
  -- this only gates whether a push goes out.
  where r.push_token is not null
    and coalesce(r.notifications_enabled, true) = true;

  if msgs is not null then
    for i in 1 .. array_length(msgs, 1) by 100 loop
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := to_jsonb(msgs[i : least(i + 99, array_length(msgs, 1))]),
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
    end loop;
  end if;

  update tasks
  set last_overdue_notified_date = today
  where deadline::date < today
    and status not in ('completed', 'in_review')
    and (last_overdue_notified_date is null or last_overdue_notified_date <> today);
end;
$$;

revoke execute on function send_overdue_reminders() from public, anon, authenticated;

select cron.schedule(
  'send-overdue-reminders',
  '50 3 * * *',
  $$select send_overdue_reminders();$$
);


-- ============================================================
-- 3. E-OFFICE REMINDERS — daily 5:00 PM IST (11:30 UTC)
--    One grouped notification per creator. No "already sent" guard
--    by design (repeats daily while files stay open) — this is
--    exactly why locking down EXECUTE on this one matters most.
-- ============================================================
create or replace function send_eoffice_reminders() returns void
language plpgsql
as $$
declare
  msgs jsonb[];
  i int;
begin
  with grouped as (
    select eo.created_by as user_id,
           count(*) as file_count,
           jsonb_agg(eo.file_no) as file_nos
    from "e-office" eo
    where eo.completed = false
    group by eo.created_by
  ),
  inserted as (
    insert into notifications (user_id, type, message, is_read, metadata)
    select g.user_id, 'eoffice_pending',
           'You have ' || g.file_count || ' eOffice ' ||
             (case when g.file_count = 1 then 'file' else 'files' end) ||
             ' pending completion.',
           false,
           jsonb_build_object('file_nos', g.file_nos, 'count', g.file_count)
    from grouped g
    returning user_id, message
  )
  select array_agg(
    jsonb_build_object(
      'to', u.expo_push_token,
      'title', 'Track your eOffice files',
      'body', i.message,
      'sound', 'default'
    )
  )
  into msgs
  from inserted i
  join users u on u.id = i.user_id
  -- notifications row above is written for every creator regardless;
  -- this only gates whether a push goes out.
  where u.expo_push_token is not null
    and coalesce(u.notifications_enabled, true) = true;

  if msgs is not null then
    for i in 1 .. array_length(msgs, 1) by 100 loop
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := to_jsonb(msgs[i : least(i + 99, array_length(msgs, 1))]),
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
    end loop;
  end if;
end;
$$;

revoke execute on function send_eoffice_reminders() from public, anon, authenticated;

select cron.schedule(
  'send-eoffice-reminders',
  '30 11 * * *',
  $$select send_eoffice_reminders();$$
);