-- ==========================================================
-- PHÂN HỆ GIÁO VIÊN CHỦ NHIỆM (HOMEROOM MODULE)
-- Migration: 20260820_homeroom_system.sql
-- ==========================================================

-- 1. BẢNG CẤU HÌNH LỚP & SƠ ĐỒ CHỖ NGỒI (homeroom_class_settings)
CREATE TABLE IF NOT EXISTS homeroom_class_settings (
    class_id TEXT PRIMARY KEY,
    pin_code TEXT NOT NULL DEFAULT '123456',
    seating_chart JSONB DEFAULT '{"rows": 5, "cols": 2, "seats_per_desk": 2, "seats": {}}',
    class_structure JSONB DEFAULT '{"groups": []}',
    announcement TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BẢNG SỰ VIỆC & GHI NHẬN NỀ NẾP (homeroom_events)
CREATE TABLE IF NOT EXISTS homeroom_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'behavior',
    category TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    points_delta INTEGER DEFAULT 0,
    description TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'gvcn',
    action_taken TEXT,
    result TEXT,
    follow_up_date TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    is_visible_to_parent BOOLEAN DEFAULT true,
    created_by TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homeroom_events_class ON homeroom_events(class_id);
CREATE INDEX IF NOT EXISTS idx_homeroom_events_student ON homeroom_events(student_id);
CREATE INDEX IF NOT EXISTS idx_homeroom_events_date ON homeroom_events(date);

-- 3. BẢNG KẾ HOẠCH HỖ TRỢ / CAN THIỆP HỌC SINH (homeroom_interventions)
CREATE TABLE IF NOT EXISTS homeroom_interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    problem TEXT NOT NULL,
    goal TEXT NOT NULL,
    measures JSONB DEFAULT '[]',
    coordinated_with JSONB DEFAULT '[]',
    start_date TEXT NOT NULL,
    review_date TEXT,
    result TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress',
    created_by TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homeroom_interventions_class ON homeroom_interventions(class_id);
CREATE INDEX IF NOT EXISTS idx_homeroom_interventions_student ON homeroom_interventions(student_id);

-- 4. BẢNG KẾ HOẠCH TUẦN / THÁNG / NĂM (homeroom_plans)
CREATE TABLE IF NOT EXISTS homeroom_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    plan_type TEXT NOT NULL DEFAULT 'weekly',
    period_key TEXT NOT NULL,
    title TEXT,
    content JSONB NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_homeroom_plans_unique 
    ON homeroom_plans(class_id, academic_year, plan_type, period_key);
CREATE INDEX IF NOT EXISTS idx_homeroom_plans_class ON homeroom_plans(class_id);

-- 5. BẢNG NHẬT KÝ LIÊN HỆ PHỤ HUYNH & GVBM (homeroom_parent_contacts)
CREATE TABLE IF NOT EXISTS homeroom_parent_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    contact_type TEXT NOT NULL DEFAULT 'call',
    contact_date TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    parent_feedback TEXT,
    status TEXT NOT NULL DEFAULT 'resolved',
    created_by TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homeroom_contacts_class ON homeroom_parent_contacts(class_id);
CREATE INDEX IF NOT EXISTS idx_homeroom_contacts_student ON homeroom_parent_contacts(student_id);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE homeroom_class_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homeroom_class_settings_all" ON homeroom_class_settings FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE homeroom_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homeroom_events_all" ON homeroom_events FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE homeroom_interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homeroom_interventions_all" ON homeroom_interventions FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE homeroom_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homeroom_plans_all" ON homeroom_plans FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE homeroom_parent_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homeroom_parent_contacts_all" ON homeroom_parent_contacts FOR ALL TO public USING (true) WITH CHECK (true);
