-- ============================================================
-- KAARYA SIDDHI — Full Database Schema
-- Consolidated from schema.sql + chat_schema.sql +
-- message_deletions.sql + the users.last_seen_at fix.
-- Run in the Supabase SQL editor. For an already-provisioned
-- project, diff against this file rather than running it
-- wholesale (some tables already exist).
-- ============================================================

create table public.users (
  id uuid not null default gen_random_uuid (),
  workspace_id uuid null,
  role character varying null,
  name character varying not null,
  email character varying not null,
  mobile_number character varying null,
  department character varying null,
  designation character varying null,
  profile_pic_url character varying null,
  language character varying null default 'english'::character varying,
  notifications_enabled boolean null default true,
  theme character varying null default 'light'::character varying,
  is_profile_setup boolean null default false,
  created_at timestamp without time zone null default now(),
  reporting_to text not null default ''::text,
  "reportingTo" text null,
  expo_push_token text null,
  push_token_status text null,
  -- Chat "online status": set on connect/heartbeat, read by the
  -- chat contacts list. See backend/routes/chat.py.
  last_seen_at timestamp with time zone null,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_reportingTo_fkey foreign KEY ("reportingTo") references admins (email),
  constraint users_workspace_id_fkey foreign KEY (workspace_id) references workspaces (id),
  constraint users_role_check check (
    (
      (role)::text = any (
        (
          array[
            'admin'::character varying,
            'employee'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;



create table public.tasks (
  id uuid not null default gen_random_uuid (),
  workspace_id uuid null,
  assigned_to text null,
  created_by text null,
  title character varying not null,
  description text null,
  deadline timestamp without time zone null,
  priority character varying null default 'medium'::character varying,
  status character varying null default 'pending'::character varying,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  attachment_url text null,
  label text null,
  suggestion text null,
  completed_at timestamp with time zone null,
  sheet_row_id integer null,
  source character varying null default 'app'::character varying,
  deadline_reminder_sent boolean not null default false,
  last_overdue_notified_date date null,
  team_batch_id text null,
  constraint tasks_pkey primary key (id),
  constraint tasks_workspace_id_fkey foreign KEY (workspace_id) references workspaces (id),
  constraint tasks_priority_check check (
    (
      (priority)::text = any (
        (
          array[
            'low'::character varying,
            'medium'::character varying,
            'high'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create unique INDEX IF not exists tasks_sheet_row_unique on public.tasks using btree (workspace_id, sheet_row_id) TABLESPACE pg_default
where
  (sheet_row_id is not null);



create table public.workspaces (
  id uuid not null default gen_random_uuid (),
  name character varying not null,
  owner_email character varying not null,
  created_at timestamp without time zone null default now(),
  constraint workspaces_pkey primary key (id)
) TABLESPACE pg_default;



create table public.task_submissions (
  id uuid not null default gen_random_uuid (),
  task_id uuid null,
  submitted_by uuid null,
  note text null,
  file_url text null,
  file_name text null,
  submitted_at timestamp without time zone null default now(),
  constraint task_submissions_pkey primary key (id),
  constraint task_submissions_submitted_by_fkey foreign KEY (submitted_by) references users (id),
  constraint task_submissions_task_id_fkey foreign KEY (task_id) references tasks (id)
) TABLESPACE pg_default;



create table public.task_reviews (
  id uuid not null default gen_random_uuid (),
  task_id uuid null,
  reviewed_by uuid null,
  feedback text null,
  decision character varying null,
  reviewed_at timestamp without time zone null default now(),
  constraint task_reviews_pkey primary key (id),
  constraint task_reviews_reviewed_by_fkey foreign KEY (reviewed_by) references users (id),
  constraint task_reviews_task_id_fkey foreign KEY (task_id) references tasks (id),
  constraint task_reviews_decision_check check (
    (
      (decision)::text = any (
        (
          array[
            'approved'::character varying,
            'add_suggestion'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;



create table public.task_files (
  id uuid not null default gen_random_uuid (),
  task_id uuid null,
  file_url character varying not null,
  file_name character varying null,
  file_type character varying null,
  storage_service character varying null,
  uploaded_at timestamp without time zone null default now(),
  constraint task_files_pkey primary key (id),
  constraint task_files_task_id_fkey foreign KEY (task_id) references tasks (id),
  constraint task_files_storage_service_check check (
    (
      (storage_service)::text = any (
        (
          array[
            'backblaze'::character varying,
            'backblaze_b2'::character varying,
            'cloudinary'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;



create table public.synced_sheet_tasks (
  id uuid not null default gen_random_uuid (),
  workspace_id uuid not null,
  sheet_row_id integer not null,
  task_id uuid null,
  first_synced_at timestamp without time zone null default now(),
  constraint synced_sheet_tasks_pkey primary key (id),
  constraint synced_sheet_tasks_workspace_id_sheet_row_id_key unique (workspace_id, sheet_row_id)
) TABLESPACE pg_default;



create table public.refresh_tokens (
  id uuid not null default gen_random_uuid (),
  user_email text not null,
  token_hash text not null,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  revoked boolean not null default false,
  replaced_by uuid null,
  constraint refresh_tokens_pkey primary key (id),
  constraint refresh_tokens_replaced_by_fkey foreign KEY (replaced_by) references refresh_tokens (id)
) TABLESPACE pg_default;



create table public.otp_tokens (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  otp_code character varying not null,
  expires_at timestamp without time zone not null,
  is_used boolean null default false,
  constraint otp_tokens_pkey primary key (id),
  constraint otp_tokens_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;



create table public.otp_sessions (
  email text not null,
  otp text not null,
  role text not null,
  created_at timestamp with time zone not null default now(),
  verify_attempts integer not null default 0,
  daily_count integer not null default 0,
  first_attempt_at timestamp with time zone null,
  last_sent_at timestamp with time zone null,
  pending_signup jsonb null,
  constraint otp_sessions_pkey primary key (email)
) TABLESPACE pg_default;



create table public.notifications (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  task_id uuid null,
  type character varying(30) null,
  message text null,
  is_read boolean null default false,
  created_at timestamp without time zone null default now(),
  metadata jsonb null,
  constraint notifications_pkey primary key (id),
  constraint notifications_task_id_fkey foreign KEY (task_id) references tasks (id) on delete CASCADE,
  constraint notifications_user_id_fkey foreign KEY (user_id) references users (id),
  constraint notifications_type_check check (
    (
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
    )
  )
) TABLESPACE pg_default;



create table public.employees (
  id uuid not null default gen_random_uuid (),
  email text not null,
  phone text null,
  push_token text null,
  created_at timestamp without time zone null default now(),
  constraint employees_pkey primary key (id),
  constraint employees_email_key unique (email)
) TABLESPACE pg_default;



-- NOTE: table name is "e-office" (hyphen). The original schema.sql had
-- this written as unquoted `e - office`, which is not valid SQL — the
-- backend (backend/routes/eoffice.py, database/eoffice_cleanup_pg_cron.sql)
-- consistently uses the hyphenated, double-quoted name below.
create table public."e-office" (
  id bigint generated by default as identity not null,
  sr_no bigint not null,
  file_no text not null,
  pending_office text null,
  pending_with text null,
  pending_since timestamp without time zone null,
  no_of_days bigint null,
  remark text null,
  completed boolean null default false,
  created_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone null,
  created_by uuid null,
  constraint "e-office_pkey" primary key (id, sr_no, file_no)
) TABLESPACE pg_default;



create table public.connections (
  id uuid not null default gen_random_uuid (),
  employee_email text not null,
  admin_email text not null,
  status text null default 'pending'::text,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint connections_pkey primary key (id),
  constraint connections_employee_email_admin_email_key unique (employee_email, admin_email),
  constraint connections_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'accepted'::text,
          'rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;



create table public.admins (
  id uuid not null default gen_random_uuid (),
  email text not null,
  phone text null,
  push_token text null,
  created_at timestamp without time zone null default now(),
  constraint admins_pkey primary key (id),
  constraint admins_email_key unique (email)
) TABLESPACE pg_default;



create table extension_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id),

    -- NOTE: no FK to users(id) live, even though this is a user id.
    -- Consider adding: REFERENCES users(id)
    requested_by UUID NOT NULL,

    current_deadline DATE NOT NULL,
    requested_deadline DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected')),
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ,
    workspace_id UUID REFERENCES workspaces(id)
);



-- ============================================================
-- CHAT — Admin <-> Employee 1:1 chat only (no employee-to-employee).
-- Enforcement happens in FastAPI (backend/routes/chat.py), not in
-- Postgres RLS — see database/rls_policies.sql for the deny-by-default
-- backstop.
-- ============================================================

-- One row per (admin, employee) pair. This IS the "chat thread".
-- Only created the first time either side opens the chat with the
-- other — not eagerly created on connection-accept.
create table public.conversations (
  id uuid not null default gen_random_uuid (),
  workspace_id uuid null,
  admin_id uuid not null,
  employee_id uuid not null,
  last_message_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  constraint conversations_pkey primary key (id),
  constraint conversations_admin_employee_key unique (admin_id, employee_id),
  constraint conversations_workspace_id_fkey foreign key (workspace_id) references workspaces (id),
  constraint conversations_admin_id_fkey foreign key (admin_id) references users (id),
  constraint conversations_employee_id_fkey foreign key (employee_id) references users (id)
) TABLESPACE pg_default;

create index IF not exists idx_conversations_admin on public.conversations using btree (admin_id);
create index IF not exists idx_conversations_employee on public.conversations using btree (employee_id);


-- Every chat message. status is DERIVED at read time from
-- delivered_at/read_at rather than stored as an enum (see inline
-- notes in database/chat_schema.sql for the reasoning).
create table public.messages (
  id uuid not null default gen_random_uuid (),
  conversation_id uuid not null,
  sender_id uuid not null,
  content text null,
  message_type character varying(20) not null default 'text',
  reply_to_id uuid null,
  is_deleted boolean not null default false,
  deleted_at timestamp with time zone null,
  delivered_at timestamp with time zone null,
  read_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  constraint messages_pkey primary key (id),
  constraint messages_conversation_id_fkey foreign key (conversation_id) references conversations (id) on delete cascade,
  constraint messages_sender_id_fkey foreign key (sender_id) references users (id),
  constraint messages_reply_to_id_fkey foreign key (reply_to_id) references messages (id) on delete set null,
  constraint messages_type_check check (
    (message_type)::text = any (
      (array['text','image','file','video','audio']::character varying[])::text[]
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_messages_conversation_created on public.messages using btree (conversation_id, created_at);
create index IF not exists idx_messages_sender on public.messages using btree (sender_id);
create index IF not exists idx_messages_reply_to on public.messages using btree (reply_to_id);


-- One message can carry multiple files (e.g. a multi-image send),
-- each uploaded to Cloudinary via the same signed upload flow as
-- task attachments / avatars. Only the URL/metadata is stored here —
-- the actual file bytes live in Cloudinary, not Postgres.
create table public.message_files (
  id uuid not null default gen_random_uuid (),
  message_id uuid not null,
  file_url character varying not null,
  file_name character varying null,
  file_type character varying null,
  file_size bigint null,
  thumbnail_url character varying null,
  storage_service character varying null default 'cloudinary',
  uploaded_at timestamp with time zone not null default now(),
  constraint message_files_pkey primary key (id),
  constraint message_files_message_id_fkey foreign key (message_id) references messages (id) on delete cascade
) TABLESPACE pg_default;

create index IF not exists idx_message_files_message on public.message_files using btree (message_id);


-- One reaction per user per message (tapping the same emoji again =
-- remove; tapping a different one = replace) — enforced by the unique
-- constraint + an upsert in the backend.
create table public.message_reactions (
  id uuid not null default gen_random_uuid (),
  message_id uuid not null,
  user_id uuid not null,
  emoji character varying(8) not null,
  created_at timestamp with time zone not null default now(),
  constraint message_reactions_pkey primary key (id),
  constraint message_reactions_message_id_fkey foreign key (message_id) references messages (id) on delete cascade,
  constraint message_reactions_user_id_fkey foreign key (user_id) references users (id),
  constraint message_reactions_unique unique (message_id, user_id)
) TABLESPACE pg_default;

create index IF not exists idx_message_reactions_message on public.message_reactions using btree (message_id);


-- "Clear chat" (for me only, per WhatsApp behavior): ONE timestamp per
-- (conversation, user) instead of a delete-marker row per historical
-- message. Fetching messages filters out anything with
-- created_at <= cleared_at for that user.
create table public.conversation_clears (
  id uuid not null default gen_random_uuid (),
  conversation_id uuid not null,
  user_id uuid not null,
  cleared_at timestamp with time zone not null default now(),
  constraint conversation_clears_pkey primary key (id),
  constraint conversation_clears_conversation_id_fkey foreign key (conversation_id) references conversations (id) on delete cascade,
  constraint conversation_clears_user_id_fkey foreign key (user_id) references users (id),
  constraint conversation_clears_unique unique (conversation_id, user_id)
) TABLESPACE pg_default;


-- "Delete for me" (per-user, per-message hide) — distinct from the
-- sender-only "delete for everyone" in messages.is_deleted, and
-- distinct from conversation_clears (which hides everything before a
-- timestamp, not one specific message). One row per (message, user)
-- who hid it; never touches the message row itself, so the other
-- person still sees it normally.
create table public.message_deletions (
  id uuid not null default gen_random_uuid (),
  message_id uuid not null,
  user_id uuid not null,
  deleted_at timestamp with time zone not null default now(),
  constraint message_deletions_pkey primary key (id),
  constraint message_deletions_message_id_fkey foreign key (message_id) references messages (id) on delete cascade,
  constraint message_deletions_user_id_fkey foreign key (user_id) references users (id),
  constraint message_deletions_unique unique (message_id, user_id)
) TABLESPACE pg_default;

create index IF not exists idx_message_deletions_user on public.message_deletions using btree (user_id);