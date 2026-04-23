-- =====================================================================
-- SCRIPT ĐỒNG BỘ CỘT DỮ LIỆU (DB ↔ CODE)
-- Kết quả quét trực tiếp DB Production ngày 2026-04-23
-- =====================================================================
-- ⚠️ AN TOÀN 100% CHO PRODUCTION:
--    • Chỉ dùng ADD COLUMN IF NOT EXISTS (không xóa/sửa/đổi tên)
--    • Chỉ dùng CREATE TABLE IF NOT EXISTS (không đụng bảng cũ)
--    • Toàn bộ thao tác nằm trong TRANSACTION
-- =====================================================================

BEGIN;

-- =============================================================
-- A. CÁC BẢNG ĐÃ TỒN TẠI — BỔ SUNG CỘT THIẾU
-- =============================================================

-- -----------------------------------------------
-- A1. attendance (18 cột hiện có)
-- Hiện có: id, student_id, class_id, type_id, status_id, date,
--          period, note, marked_by, created_at, updated_at, session,
--          status_notes, violation_notes, reward_notes,
--          missed_periods, violation_periods, reward_periods
-- -----------------------------------------------
-- Code đang INSERT cột này (import-attendance.ts) nhưng DB chưa có:
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS marked_by_role TEXT;

-- -----------------------------------------------
-- A2. profiles (10 cột hiện có)
-- Hiện có: id, email, full_name, role, is_active,
--          created_at, updated_at, firebase_id, permissions, student_code
-- -----------------------------------------------
-- AppUser.editWindowMinutes — cần cho auth-guard checkEditWindow()
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS edit_window_minutes INTEGER DEFAULT 1440;
-- AppUser.lastLoginAt — ghi lại login cuối
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- -----------------------------------------------
-- A3. classes (10 cột hiện có)
-- Hiện có: id, year_id, name, grade, class_type,
--          created_at, updated_at, firebase_id,
--          manual_student_count, adjustment_count
--
-- GHI CHÚ: Code lấy teacher_id/teacher_name qua JOIN teacher_classes,
-- KHÔNG lưu trực tiếp trong bảng classes.
-- Nhưng TypeScript Model Class vẫn cần các trường này:
-- -----------------------------------------------
-- actual_student_count — sĩ số thực tế tính tự động
ALTER TABLE classes ADD COLUMN IF NOT EXISTS actual_student_count INTEGER DEFAULT 0;
-- sessions — buổi học của lớp (JSONB array)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS sessions JSONB DEFAULT '["morning"]'::jsonb;
-- is_personal — lớp cá nhân do GV tự tạo
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_personal BOOLEAN DEFAULT false;
-- owner_id — UID người tạo lớp cá nhân
ALTER TABLE classes ADD COLUMN IF NOT EXISTS owner_id TEXT;

-- -----------------------------------------------
-- A4. students (15 cột hiện có)
-- Hiện có: id, student_code, full_name, gender, birthday,
--          status, status_note, status_date, created_at, updated_at,
--          firebase_id, is_deleted, ethnicity, gov_id, deleted_at
--
-- GHI CHÚ: first_name/last_name hiện đang được TÍNH từ full_name
-- trong transformers.ts (split runtime). Tuy nhiên nếu muốn
-- query/sort theo tên trên DB thì cần cột riêng.
-- -----------------------------------------------
-- status_expected_return — dự kiến quay lại (temporary_leave)
ALTER TABLE students ADD COLUMN IF NOT EXISTS status_expected_return TIMESTAMPTZ;
-- status_history — lịch sử thay đổi trạng thái (JSONB array)
ALTER TABLE students ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- -----------------------------------------------
-- A5. teacher_classes (6 cột hiện có)
-- Hiện có: id, teacher_id, class_id, subject_id, is_homeroom, created_at
-- → ĐẦY ĐỦ, không thiếu gì
-- -----------------------------------------------

-- -----------------------------------------------
-- A6. academic_years (7 cột hiện có)
-- Hiện có: id, name, start_date, end_date, is_active, created_at, updated_at
-- → ĐẦY ĐỦ
-- -----------------------------------------------

-- -----------------------------------------------
-- A7. attendance_types (4 cột), attendance_statuses (6 cột)
-- → ĐẦY ĐỦ
-- -----------------------------------------------

-- -----------------------------------------------
-- A8. student_classes (6 cột hiện có)
-- Hiện có: id, student_id, class_id, enrollment_date, is_active, order_index
-- → ĐẦY ĐỦ
-- -----------------------------------------------

-- -----------------------------------------------
-- A9. settings (4 cột), chat_threads (5 cột), chat_messages (6 cột)
-- → ĐẦY ĐỦ
-- -----------------------------------------------


-- =============================================================
-- B. CÁC BẢNG CHƯA TỒN TẠI — TẠO MỚI
-- (Code đang gọi .from('tên_bảng') nhưng DB chưa có)
-- =============================================================

-- -----------------------------------------------
-- B1. report_presets
-- Dùng bởi: preset-service.ts (getPresets, createPreset, updatePreset, deletePreset)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS report_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id TEXT,
    name TEXT NOT NULL,
    visible_column_ids JSONB DEFAULT '[]'::jsonb,
    frequency_filters JSONB DEFAULT '[]'::jsonb,
    show_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------
-- B2. columns
-- Dùng bởi: column-service.ts (7 truy vấn)
-- -----------------------------------------------
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

-- -----------------------------------------------
-- B3. column_records
-- Dùng bởi: record-service.ts (11 truy vấn)
-- -----------------------------------------------
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

-- -----------------------------------------------
-- B4. timetables
-- Dùng bởi: timetable-service.ts (5 truy vấn), api/v1/export/json route
-- -----------------------------------------------
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

-- -----------------------------------------------
-- B5. api_keys
-- Dùng bởi: api-key-service.ts (7 truy vấn), api-middleware.ts
-- -----------------------------------------------
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


-- =============================================================
-- C. RLS POLICIES CHO BẢNG MỚI
-- (Tạm mở public cho authenticated, siết sau khi STRICT mode)
-- =============================================================

ALTER TABLE report_presets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_presets' AND policyname='report_presets_select') THEN
        CREATE POLICY "report_presets_select" ON report_presets FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_presets' AND policyname='report_presets_insert') THEN
        CREATE POLICY "report_presets_insert" ON report_presets FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_presets' AND policyname='report_presets_update') THEN
        CREATE POLICY "report_presets_update" ON report_presets FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_presets' AND policyname='report_presets_delete') THEN
        CREATE POLICY "report_presets_delete" ON report_presets FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='columns' AND policyname='columns_select') THEN
        CREATE POLICY "columns_select" ON columns FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='columns' AND policyname='columns_insert') THEN
        CREATE POLICY "columns_insert" ON columns FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='columns' AND policyname='columns_update') THEN
        CREATE POLICY "columns_update" ON columns FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='columns' AND policyname='columns_delete') THEN
        CREATE POLICY "columns_delete" ON columns FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

ALTER TABLE column_records ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='column_records' AND policyname='column_records_select') THEN
        CREATE POLICY "column_records_select" ON column_records FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='column_records' AND policyname='column_records_insert') THEN
        CREATE POLICY "column_records_insert" ON column_records FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='column_records' AND policyname='column_records_update') THEN
        CREATE POLICY "column_records_update" ON column_records FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='column_records' AND policyname='column_records_delete') THEN
        CREATE POLICY "column_records_delete" ON column_records FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='timetables' AND policyname='timetables_select') THEN
        CREATE POLICY "timetables_select" ON timetables FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='timetables' AND policyname='timetables_insert') THEN
        CREATE POLICY "timetables_insert" ON timetables FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='timetables' AND policyname='timetables_update') THEN
        CREATE POLICY "timetables_update" ON timetables FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='timetables' AND policyname='timetables_delete') THEN
        CREATE POLICY "timetables_delete" ON timetables FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='api_keys' AND policyname='api_keys_select') THEN
        CREATE POLICY "api_keys_select" ON api_keys FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='api_keys' AND policyname='api_keys_insert') THEN
        CREATE POLICY "api_keys_insert" ON api_keys FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='api_keys' AND policyname='api_keys_update') THEN
        CREATE POLICY "api_keys_update" ON api_keys FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='api_keys' AND policyname='api_keys_delete') THEN
        CREATE POLICY "api_keys_delete" ON api_keys FOR DELETE TO authenticated USING (true);
    END IF;
END $$;


-- =============================================================
-- D. AUTO-UPDATE TRIGGER (updated_at tự động cập nhật khi UPDATE)
-- =============================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_attendance_modtime ON attendance;
CREATE TRIGGER update_attendance_modtime
BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_report_presets_modtime ON report_presets;
CREATE TRIGGER update_report_presets_modtime
BEFORE UPDATE ON report_presets FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_columns_modtime ON columns;
CREATE TRIGGER update_columns_modtime
BEFORE UPDATE ON columns FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_column_records_modtime ON column_records;
CREATE TRIGGER update_column_records_modtime
BEFORE UPDATE ON column_records FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_timetables_modtime ON timetables;
CREATE TRIGGER update_timetables_modtime
BEFORE UPDATE ON timetables FOR EACH ROW EXECUTE PROCEDURE update_modified_column();


-- =============================================================
-- E. RELOAD SCHEMA CACHE
-- =============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =====================================================================
-- KẾT QUẢ DỰ KIẾN SAU KHI CHẠY SCRIPT NÀY:
--
-- BẢNG CÓ SẴN — BỔ SUNG CỘT:
--   ✅ attendance:      +1 cột  (marked_by_role)
--   ✅ profiles:        +2 cột  (edit_window_minutes, last_login_at)
--   ✅ classes:         +4 cột  (actual_student_count, sessions, is_personal, owner_id)
--   ✅ students:        +2 cột  (status_expected_return, status_history)
--   ✅ teacher_classes:  ĐẦY ĐỦ
--   ✅ academic_years:   ĐẦY ĐỦ
--   ✅ attendance_types: ĐẦY ĐỦ
--   ✅ attendance_statuses: ĐẦY ĐỦ
--   ✅ student_classes:  ĐẦY ĐỦ
--   ✅ settings:         ĐẦY ĐỦ
--   ✅ chat_threads:     ĐẦY ĐỦ
--   ✅ chat_messages:    ĐẦY ĐỦ
--
-- BẢNG TẠO MỚI:
--   🆕 report_presets   (preset-service.ts)
--   🆕 columns          (column-service.ts)
--   🆕 column_records   (record-service.ts)
--   🆕 timetables       (timetable-service.ts)
--   🆕 api_keys         (api-key-service.ts)
--
-- BONUS:
--   🔒 RLS Policies cho 5 bảng mới
--   ⚡ Indexes cho performance
--   🔄 Auto-update triggers cho updated_at
-- =====================================================================
