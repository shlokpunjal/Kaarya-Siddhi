-- database/task_suggestion_and_cleanup_pg_cron.sql
--
-- Two independent changes, bundled in one file to run together:
--
--   1. Allows the new 'task_suggestion' notification type (the admin
--      "Suggest Changes" / "Add Suggestion" flow — see
--      backend/routes/employee_tasks.py:update_task) to actually be
--      inserted into `notifications`. Without this, every attempt to
--      notify the employee fails silently against the existing
--      notifications_type_check constraint (create_notification() in
--      notify_utils.py swallows the error and just logs it).
--
--   2. Auto-deletes tasks 15 days after they're marked completed, via
--      pg_cron — matching the pattern the deadline/overdue/eoffice jobs
--      in reminders_pg_cron.sql already use. complete.tsx already tells
--      the employee "It will be automatically deleted 15 days from now"
--      when they mark a task complete; this is what makes that true.
--
-- SETUP (run once, in Supabase SQL Editor):
--   1. Requires pg_cron already enabled (reminders_pg_cron.sql needs it
--      too — skip if you've already run that file).
--   2. Run this whole file once.
--   3. Test manually before trusting the schedule:
--        select delete_old_completed_tasks();
--   4. Check run history any time:
--        select jobname, status, return_message, start_time, end_time
--        from cron.job_run_details jrd
--        join cron.job j on j.jobid = jrd.jobid
--        where j.jobname = 'delete-old-completed-tasks'
--        order by start_time desc limit 20;

-- ============================================================
-- 1. Allow 'task_suggestion' as a notifications.type value
-- ============================================================
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    (type)::text = any (
      (
        array[
          'deadline'::character varying,
          'overdue'::character varying,
          'task_assigned'::character varying,
          'task_in_review'::character varying,
          'task_suggestion'::character varying,
          'eoffice_pending'::character varying,
          'extension_accepted'::character varying,
          'extension_rejected'::character varying,
          'connection_request'::character varying,
          'connection_pending'::character varying,
          'connection_rejected'::character varying,
          'connection_accepted'::character varying
        ]
      )::text[]
    )
  );

-- ============================================================
-- 2. AUTO-DELETE COMPLETED TASKS — 15 days after completed_at,
--    daily at 3:00 AM IST (21:30 UTC, previous day)
--
--    Mirrors the manual cleanup DELETE /tasks/{id} does in
--    backend/routes/employee_tasks.py: task_files, notifications,
--    task_reviews, and task_submissions rows referencing the task are
--    NOT ON DELETE CASCADE and must be cleared first, or Postgres
--    raises a foreign key violation on the tasks delete itself.
--    (extension_requests.task_id -> tasks IS ON DELETE CASCADE, per
--    backend/services.py's delete_user_account — no action needed.)
-- ============================================================
create or replace function delete_old_completed_tasks() returns void
language plpgsql
as $$
declare
  stale_ids uuid[];
begin
  select array_agg(id) into stale_ids
  from tasks
  where status = 'completed'
    and completed_at is not null
    and completed_at < now() - interval '15 days';

  if stale_ids is null or array_length(stale_ids, 1) is null then
    return;
  end if;

  delete from task_files where task_id = any(stale_ids);
  delete from notifications where task_id = any(stale_ids);
  delete from task_reviews where task_id = any(stale_ids);
  delete from task_submissions where task_id = any(stale_ids);
  delete from tasks where id = any(stale_ids);
end;
$$;

revoke execute on function delete_old_completed_tasks() from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'delete-old-completed-tasks';

select cron.schedule(
  'delete-old-completed-tasks',
  '30 21 * * *',
  $$select delete_old_completed_tasks();$$
);
