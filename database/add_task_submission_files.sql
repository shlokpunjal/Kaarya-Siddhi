-- Fix: "Ask to Review" file submission fails with an error.
--
-- Root cause: backend/routes/employee_tasks.py's ask_for_review() inserts
-- a "file_url" and "file_name" key into task_submissions on every request
-- (even when no file is attached, they're inserted as null), but the
-- task_submissions table was never given those columns — so Supabase
-- rejects the insert and the request fails.
--
-- Run this once against your Supabase database to add the missing columns.

alter table public.task_submissions
  add column if not exists file_url text null,
  add column if not exists file_name text null;
