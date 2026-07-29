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




create table public.e - office (
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
  constraint e - office_pkey primary key (id, sr_no, file_no)
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