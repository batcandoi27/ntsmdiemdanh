-- Migration: Zalo Bot Gateway Integration & Timetable / Daily Homework Subsystems (V4.4)

-- 1. Student Parents Zalo Mapping Table
CREATE TABLE IF NOT EXISTS student_parents_zalo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_code VARCHAR(50) NOT NULL,
    student_name VARCHAR(150) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    parent_zalo_id VARCHAR(100) NOT NULL,
    parent_name VARCHAR(150),
    parent_phone VARCHAR(20),
    is_friend BOOLEAN DEFAULT TRUE,
    alias_set VARCHAR(150),
    status VARCHAR(30) DEFAULT 'CONNECTED', -- 'CONNECTED', 'DISCONNECTED'
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_interacted_at TIMESTAMPTZ,
    UNIQUE(student_id, parent_zalo_id)
);

CREATE INDEX IF NOT EXISTS idx_student_parents_zalo_parent ON student_parents_zalo(parent_zalo_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_zalo_student ON student_parents_zalo(student_id);

-- 2. Class Zalo Groups Table
CREATE TABLE IF NOT EXISTS class_zalo_groups (
    class_id UUID PRIMARY KEY REFERENCES classes(id) ON DELETE CASCADE,
    class_name VARCHAR(50) NOT NULL,
    zalo_group_id VARCHAR(100) NOT NULL,
    group_name VARCHAR(200),
    is_bot_deputy BOOLEAN DEFAULT FALSE, -- Quyền Phó Nhóm (Code 166 Guard)
    auto_report_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Zalo Message Logs & Outbox Table
CREATE TABLE IF NOT EXISTS zalo_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(150) UNIQUE NOT NULL,
    thread_id VARCHAR(100) NOT NULL,
    thread_type INT DEFAULT 0, -- 0: DM, 1: Group
    message_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(30) DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    error_code INT,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Interactive Sessions Table (Multi-Child & State Machine)
CREATE TABLE IF NOT EXISTS zalo_interactive_sessions (
    parent_zalo_id VARCHAR(100) PRIMARY KEY,
    current_step VARCHAR(50) NOT NULL,
    selected_student_id UUID REFERENCES students(id),
    session_data JSONB DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Class Timetables Table
CREATE TABLE IF NOT EXISTS class_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL, -- 2: Thứ Hai -> 7: Thứ Bảy
    session VARCHAR(10) NOT NULL, -- 'MORNING', 'AFTERNOON'
    period INT NOT NULL, -- Tiết 1 -> 5
    subject_name VARCHAR(100) NOT NULL,
    teacher_name VARCHAR(150),
    room_name VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, day_of_week, session, period)
);

-- 6. Daily Homework Reports Table
CREATE TABLE IF NOT EXISTS daily_homework_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    created_by_role VARCHAR(50) DEFAULT 'STUDENT_BCS',
    created_by_name VARCHAR(150) NOT NULL,
    entries JSONB NOT NULL DEFAULT '[]',
    general_announcement TEXT,
    is_published BOOLEAN DEFAULT TRUE,
    sent_to_zalo_group BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, report_date)
);

-- 7. Class Reporters (Ban Cán Sự Lớp) Table
CREATE TABLE IF NOT EXISTS class_reporters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    role_title VARCHAR(100) DEFAULT 'Lớp Phó Học Tập',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);
