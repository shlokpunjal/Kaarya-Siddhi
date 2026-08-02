-- Auto-deletes completed e-office file records 1 day after completion.
-- Runs daily; keeps the e-office tracking table from accumulating
-- stale completed entries indefinitely.
--
-- Safe to re-run: unschedule + reschedule.

SELECT cron.unschedule('delete-completed-eoffice-files');

SELECT cron.schedule(
  'delete-completed-eoffice-files',
  '0 2 * * 0',  -- every Sunday at 2:00 AM
  $$
    DELETE FROM public."e-office"
    WHERE completed = true
      AND completed_at IS NOT NULL
      AND completed_at < now() - interval '7 days';
  $$
);