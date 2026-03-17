-- ========================================================
-- FIX RLS & RPC FOR APP DIEM DANH
-- ========================================================

-- 1. Tạo hàm exec_sql để chạy SQL từ code (Cần thiết cho script apply-rls.ts)
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- 2. Cấp quyền SELECT (Xem) cho các bảng cấu hình & danh mục
-- Cho phép mọi user đã đăng nhập (Teacher, Supervisor, Admin...) xem dữ liệu này
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Classes viewable by authenticated" ON classes;
CREATE POLICY "Classes viewable by authenticated" ON classes FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Years viewable by authenticated" ON academic_years;
CREATE POLICY "Years viewable by authenticated" ON academic_years FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE attendance_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Types viewable by authenticated" ON attendance_types;
CREATE POLICY "Types viewable by authenticated" ON attendance_types FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE attendance_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Statuses viewable by authenticated" ON attendance_statuses;
CREATE POLICY "Statuses viewable by authenticated" ON attendance_statuses FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE student_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Student classes viewable by authenticated" ON student_classes;
CREATE POLICY "Student classes viewable by authenticated" ON student_classes FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teacher classes viewable by authenticated" ON teacher_classes;
CREATE POLICY "Teacher classes viewable by authenticated" ON teacher_classes FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students viewable by authenticated" ON students;
CREATE POLICY "Students viewable by authenticated" ON students FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Cấp quyền quản lý Attendance (Điểm danh)
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Attendance viewable by authenticated" ON attendance;
CREATE POLICY "Attendance viewable by authenticated" ON attendance FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin/Teacher manage attendance" ON attendance;
CREATE POLICY "Admin/Teacher manage attendance" ON attendance FOR ALL 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR 
    EXISTS (SELECT 1 FROM teacher_classes WHERE teacher_id = auth.uid() AND class_id = attendance.class_id)
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor')
);

-- 4. Đảm bảo Admin có toàn quyền trên mọi bảng
-- (Profiles đã có policy Admin full access trong schema.sql)
