-- User Roles
CREATE TYPE user_role AS ENUM (
    'admin',
    'employee'
);

-- Task Status
CREATE TYPE task_status AS ENUM (
    'overdue',
    'pending',
    'in_review',
    'completed'
);

-- Extension Status
CREATE TYPE extension_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

--------------------------------------------------
-- USERS
--------------------------------------------------

CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL,

    linked_admin_id UUID,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_linked_admin
        FOREIGN KEY (linked_admin_id)
        REFERENCES users(id)
);

--------------------------------------------------
-- TASKS
--------------------------------------------------

CREATE TABLE tasks (
    id UUID PRIMARY KEY,

    title VARCHAR(255) NOT NULL,

    status task_status DEFAULT 'pending',

    assigned_to UUID NOT NULL,
    created_by UUID NOT NULL,

    due_date TIMESTAMP NOT NULL,

    suggestion TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_assigned_to
        FOREIGN KEY (assigned_to)
        REFERENCES users(id),

    CONSTRAINT fk_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
);

--------------------------------------------------
-- EXTENSIONS
--------------------------------------------------

CREATE TABLE extensions (
    id UUID PRIMARY KEY,

    task_id UUID NOT NULL,

    requested_by UUID NOT NULL,

    new_due_date TIMESTAMP NOT NULL,

    status extension_status DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_task
        FOREIGN KEY (task_id)
        REFERENCES tasks(id),

    CONSTRAINT fk_requested_by
        FOREIGN KEY (requested_by)
        REFERENCES users(id)
);