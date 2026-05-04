-- =====================================================================
-- SCRIPT KHỞI TẠO HỆ THỐNG ĐIỂM DANH GIÁO VIÊN (TAS)
-- =====================================================================
-- ⚠️ AN TOÀN CHO PRODUCTION:
--    • Sử dụng CREATE TABLE IF NOT EXISTS
--    • Toàn bộ thao tác nằm trong TRANSACTION
-- =====================================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. Bảng teachers (Hồ sơ nhân sự)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id),
    full_name TEXT NOT NULL,
    cccd TEXT UNIQUE,
    issued_date DATE,
    issued_place TEXT,
    address TEXT,
    position TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------------
-- 2. Bảng teacher_groups (Tổ, Đoàn thể, Chi bộ...)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('department', 'union', 'party', 'custom')),
    level TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------------
-- 3. Bảng teacher_group_members (Quan hệ N-N)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_group_members (
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    group_id UUID REFERENCES teacher_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, group_id)
);

-- -------------------------------------------------------------
-- 4. Bảng teacher_events (Cuộc họp/Sự kiện)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    recurrence TEXT DEFAULT 'once', -- 'once', 'daily', 'weekly', 'monthly'
    qr_secret TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------------
-- 5. Bảng event_groups (Nhóm tham gia sự kiện)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_groups (
    event_id UUID REFERENCES teacher_events(id) ON DELETE CASCADE,
    group_id UUID REFERENCES teacher_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, group_id)
);

-- -------------------------------------------------------------
-- 6. Bảng teacher_attendance (Ghi nhận điểm danh)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    event_id UUID REFERENCES teacher_events(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'absent', -- 'present', 'absent', 'on_duty', 'substitute', 'leave'
    note TEXT,
    is_verified BOOLEAN DEFAULT false,
    marked_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tạo Index để tối ưu query điểm danh theo ngày và sự kiện
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON teacher_attendance(check_in_date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_event ON teacher_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher ON teacher_attendance(teacher_id);

-- -------------------------------------------------------------
-- 7. RLS POLICIES (Mở quyền cho Authenticated Users)
-- -------------------------------------------------------------

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;

-- Tạm thời cho phép authenticated users thực hiện các thao tác CRUD
-- (Admin sẽ được siết chặt hơn qua logic ứng dụng hoặc policy chi tiết sau)

DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    AND tablename IN ('teachers', 'teacher_groups', 'teacher_group_members', 'teacher_events', 'event_groups', 'teacher_attendance') 
    LOOP
        EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT TO authenticated USING (true)', t, t);
        EXECUTE format('CREATE POLICY %I_insert ON %I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
        EXECUTE format('CREATE POLICY %I_update ON %I FOR UPDATE TO authenticated USING (true)', t, t);
        EXECUTE format('CREATE POLICY %I_delete ON %I FOR DELETE TO authenticated USING (true)', t, t);
    END LOOP;
END $$;

-- -------------------------------------------------------------
-- 8. TRIGGERS (Tự động cập nhật updated_at)
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teachers_modtime BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_teacher_groups_modtime BEFORE UPDATE ON teacher_groups FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_teacher_events_modtime BEFORE UPDATE ON teacher_events FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_teacher_attendance_modtime BEFORE UPDATE ON teacher_attendance FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- -------------------------------------------------------------
-- 9. RELOAD CACHE
-- -------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
