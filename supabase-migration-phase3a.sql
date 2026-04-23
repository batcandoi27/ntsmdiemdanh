-- =========================================
-- Phase 3A: Tạo 4 bảng mới cho Supabase
-- Chạy trong Supabase Dashboard > SQL Editor
-- =========================================

-- 1. COLUMNS (cho column-service)
CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'system',
    name TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'custom',
    frequency TEXT NOT NULL DEFAULT 'daily',
    period_config JSONB,
    sub_periods JSONB DEFAULT '[]',
    suggestions JSONB DEFAULT '[]',
    allow_free_text BOOLEAN DEFAULT true,
    applicable_scope TEXT DEFAULT 'all',
    applicable_student_ids JSONB,
    archived BOOLEAN DEFAULT false,
    default_visibility BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_columns_class ON columns(class_id);
CREATE INDEX IF NOT EXISTS idx_columns_class_user ON columns(class_id, user_id);

-- 2. COLUMN_RECORDS (cho record-service)
CREATE TABLE IF NOT EXISTS column_records (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL,
    student_code TEXT NOT NULL,
    record_type TEXT NOT NULL DEFAULT 'daily',
    date TEXT,
    selected_suggestions JSONB DEFAULT '[]',
    period_key TEXT,
    value JSONB,
    status TEXT,
    completed_at TIMESTAMPTZ,
    note TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_column_records_daily
    ON column_records(column_id, date, student_code)
    WHERE record_type = 'daily';

CREATE UNIQUE INDEX IF NOT EXISTS idx_column_records_period
    ON column_records(column_id, period_key, student_code)
    WHERE record_type = 'period';

CREATE UNIQUE INDEX IF NOT EXISTS idx_column_records_onetime
    ON column_records(column_id, student_code)
    WHERE record_type = 'one_time';

CREATE INDEX IF NOT EXISTS idx_column_records_column ON column_records(column_id);
CREATE INDEX IF NOT EXISTS idx_column_records_date ON column_records(column_id, date);

-- 3. TIMETABLES (cho timetable-service)
CREATE TABLE IF NOT EXISTS timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id TEXT NOT NULL,
    class_name TEXT NOT NULL,
    effective_from TEXT NOT NULL,
    effective_to TEXT NOT NULL,
    schedule JSONB NOT NULL,
    created_by TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timetables_class ON timetables(class_id);
CREATE INDEX IF NOT EXISTS idx_timetables_active ON timetables(class_id, is_active);

-- 4. API_KEYS (cho api-key-service)
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    permissions JSONB DEFAULT '["read"]',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

-- =========================================
-- RLS Policies
-- =========================================

ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "columns_select" ON columns FOR SELECT TO authenticated USING (true);
CREATE POLICY "columns_insert" ON columns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "columns_update" ON columns FOR UPDATE TO authenticated USING (true);
CREATE POLICY "columns_delete" ON columns FOR DELETE TO authenticated USING (true);

ALTER TABLE column_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "column_records_select" ON column_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "column_records_insert" ON column_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "column_records_update" ON column_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "column_records_delete" ON column_records FOR DELETE TO authenticated USING (true);

ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timetables_select" ON timetables FOR SELECT TO authenticated USING (true);
CREATE POLICY "timetables_insert" ON timetables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "timetables_update" ON timetables FOR UPDATE TO authenticated USING (true);
CREATE POLICY "timetables_delete" ON timetables FOR DELETE TO authenticated USING (true);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_select" ON api_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "api_keys_insert" ON api_keys FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "api_keys_update" ON api_keys FOR UPDATE TO authenticated USING (true);
CREATE POLICY "api_keys_delete" ON api_keys FOR DELETE TO authenticated USING (true);

-- =========================================
-- Done! Verify với: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- =========================================
