-- ============================================================
-- CHAT SCHEMA — Kaarya Siddhi
-- Admin <-> Employee 1:1 chat only (no employee-to-employee).
-- Follows the existing service-role-bypasses-RLS pattern used
-- everywhere else in this app: enforcement happens in FastAPI,
-- not in Postgres RLS. Run this in the Supabase SQL editor.
-- ============================================================

-- One row per (admin, employee) pair. This IS the "chat thread".
-- Only created the first time either side opens the chat with the
-- other — not eagerly created on connection-accept, to avoid
-- littering the table with threads nobody ever opens.
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


-- Every chat message. `delivered_at`/`read_at` are nullable timestamps
-- rather than a status enum — since a 1:1 thread has exactly one
-- recipient, we don't need a per-user receipts table like WhatsApp's
-- group chats do. status is DERIVED at read time:
--   read_at set       -> "read"      (blue double tick)
--   delivered_at set  -> "delivered" (grey double tick)
--   neither set       -> "sent"      (single grey tick)
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
  -- CASCADE (unlike tasks' NO ACTION) so deleting a conversation cleans
  -- up messages/files/reactions automatically — no manual delete-order
  -- dance required in the backend for this feature.
  constraint messages_conversation_id_fkey foreign key (conversation_id) references conversations (id) on delete cascade,
  constraint messages_sender_id_fkey foreign key (sender_id) references users (id),
  -- ON DELETE SET NULL: if the replied-to message is later hard-deleted
  -- (shouldn't normally happen since we soft-delete via is_deleted), the
  -- reply doesn't get orphaned/cascaded away too.
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


-- Mirrors task_files. One message can carry multiple files (e.g. a
-- multi-image send), each uploaded to Cloudinary via the same signed
-- upload flow as task attachments / avatars.
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
-- constraint + an upsert in the backend, exactly like WhatsApp.
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


-- "Clear chat" (for me only, per WhatsApp behavior): instead of
-- inserting a delete-marker row per historical message (expensive for
-- a long thread and pointless churn), we store ONE timestamp per
-- (conversation, user). Fetching messages filters out anything with
-- created_at <= cleared_at for that user. New messages sent *after*
-- clearing still show up normally — exactly like WhatsApp.
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