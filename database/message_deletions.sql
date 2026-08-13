-- "Delete for me" (per-user, per-message hide) — distinct from the
-- existing sender-only "delete for everyone" in messages.is_deleted,
-- and distinct from conversation_clears (which hides everything
-- before a timestamp, not one specific message). Same pattern as
-- conversation_clears: one row per (message, user) who hid it; never
-- touches the message row itself, so the other person still sees it
-- normally.
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