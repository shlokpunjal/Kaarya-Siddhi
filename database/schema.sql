--------------------------------------------------
-- WORKSPACES
--------------------------------------------------

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    owner_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

--------------------------------------------------
-- USERS
--------------------------------------------------

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    role VARCHAR(20) CHECK (role IN ('admin', 'employee')),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile_number VARCHAR(20),
    department VARCHAR(100),
    date_of_birth DATE,
    designation VARCHAR(100),
    profile_pic_url VARCHAR(500),
    language VARCHAR(20) DEFAULT 'english',
    notifications_enabled BOOLEAN DEFAULT true,
    theme VARCHAR(20) DEFAULT 'light',
    is_profile_setup BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),

    -- NOTE: both of these exist live. reporting_to is unused/legacy;
    -- "reportingTo" (camelCase, FK'd to admins.email) is the one actually
    -- referenced by a foreign key. Worth consolidating into one column.
    reporting_to TEXT NOT NULL DEFAULT '',
    "reportingTo" TEXT,

    expo_push_token TEXT
);

--------------------------------------------------
-- TASKS
--------------------------------------------------

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),

    -- stored as email text, not a uuid FK to users
    assigned_to TEXT,
    created_by TEXT,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline TIMESTAMP,
    priority VARCHAR(20) DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),

    -- no CHECK constraint live; app-level values are:
    -- 'overdue' | 'pending' | 'inReview' | 'completed'
    status VARCHAR(20) DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    attachment_url TEXT,
    label TEXT,
    suggestion TEXT
);

--------------------------------------------------
-- TASK FILES
--------------------------------------------------

CREATE TABLE task_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id),
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    storage_service VARCHAR(30)
        CHECK (storage_service IN ('backblaze', 'backblaze_b2', 'cloudinary')),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

--------------------------------------------------
-- TASK SUBMISSIONS
--------------------------------------------------

CREATE TABLE task_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id),
    submitted_by UUID REFERENCES users(id),
    note TEXT,
    submitted_at TIMESTAMP DEFAULT NOW()
);

--------------------------------------------------
-- TASK REVIEWS
--------------------------------------------------

CREATE TABLE task_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id),
    reviewed_by UUID REFERENCES users(id),
    feedback TEXT,
    decision VARCHAR(20)
        CHECK (decision IN ('approved', 'add_suggestion')),
    reviewed_at TIMESTAMP DEFAULT NOW()
);

--------------------------------------------------
-- CHAT MESSAGES
--------------------------------------------------

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    sender_id UUID REFERENCES users(id),
    task_id UUID REFERENCES tasks(id),
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW()
);

--------------------------------------------------
-- NOTIFICATIONS
--------------------------------------------------

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    task_id UUID REFERENCES tasks(id),
    type VARCHAR(20)
        CHECK (type IN ('deadline', 'assigned', 'reviewed', 'completed')),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

--------------------------------------------------
-- CONNECTIONS  (employee <-> admin link requests)
--------------------------------------------------

CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_email TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

--------------------------------------------------
-- EXTENSION REQUESTS
--------------------------------------------------

CREATE TABLE extension_requests (
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

--------------------------------------------------
-- OTP SESSIONS  (signup + login OTP flow)
--------------------------------------------------

CREATE TABLE otp_sessions (
    email TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verify_attempts INTEGER NOT NULL DEFAULT 0,
    daily_count INTEGER NOT NULL DEFAULT 0,
    first_attempt_at TIMESTAMPTZ,
    last_sent_at TIMESTAMPTZ,
    pending_signup JSONB
);

--------------------------------------------------
-- REFRESH TOKENS
--------------------------------------------------

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    replaced_by UUID REFERENCES refresh_tokens(id)
);