-- =====================================================
-- FINAL PRO MIGRATION - STUDENT MANAGEMENT FIX
-- =====================================================

-- 1. Thêm cột vào bảng students
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS ethnicity TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gov_id TEXT;

-- 2. Thêm cột vào bảng student_classes
ALTER TABLE student_classes ADD COLUMN IF NOT EXISTS order_index INT4;

-- 3. Tạo Partial Index cho student_code (chỉ check unique khi chưa xóa)
DROP INDEX IF EXISTS idx_unique_active_student_code;
CREATE UNIQUE INDEX idx_unique_active_student_code ON students (student_code) WHERE (is_deleted IS FALSE);

-- 4. Function check quyền giáo viên (SECURITY DEFINER + search_path)
CREATE OR REPLACE FUNCTION is_class_teacher(p_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM teacher_classes
    WHERE teacher_id = auth.uid() AND class_id = p_class_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. RPC Upsert Student (Atomic Transaction)
CREATE OR REPLACE FUNCTION rpc_upsert_student(
  p_student_id UUID,
  p_class_id UUID,
  p_payload JSONB
) RETURNS VOID AS $$
BEGIN
  -- 5.1 Cập nhật bảng students
  INSERT INTO students (
    id, 
    student_code, 
    full_name, 
    gender, 
    birthday, 
    gov_id, 
    ethnicity,
    status,
    is_deleted
  )
  VALUES (
    p_student_id,
    (p_payload->>'student_code'),
    (p_payload->>'full_name'),
    (p_payload->>'gender'),
    (p_payload->>'birthday')::DATE,
    (p_payload->>'gov_id'),
    (p_payload->>'ethnicity'),
    COALESCE(p_payload->>'status', 'active'),
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    student_code = EXCLUDED.student_code,
    full_name = EXCLUDED.full_name,
    gender = EXCLUDED.gender,
    birthday = EXCLUDED.birthday,
    gov_id = EXCLUDED.gov_id,
    ethnicity = EXCLUDED.ethnicity,
    status = EXCLUDED.status,
    is_deleted = FALSE,
    updated_at = NOW();

  -- 5.2 Cập nhật bảng mapping student_classes
  INSERT INTO student_classes (student_id, class_id, order_index)
  VALUES (p_student_id, p_class_id, (p_payload->>'order_index')::INT4)
  ON CONFLICT (student_id, class_id) DO UPDATE SET
    order_index = EXCLUDED.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. RPC Soft Delete
CREATE OR REPLACE FUNCTION rpc_soft_delete_student(p_student_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE students SET is_deleted = TRUE WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Secure View với PII Masking
CREATE OR REPLACE VIEW v_student_list WITH (security_invoker = true) AS
SELECT 
    s.id,
    s.student_code,
    s.full_name,
    s.gender,
    s.birthday,
    s.status,
    s.ethnicity,
    CASE 
        WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' THEN s.gov_id 
        ELSE '********' || RIGHT(s.gov_id, 4) 
    END as gov_id,
    sc.class_id,
    sc.order_index as "order",
    s.is_deleted
FROM students s
JOIN student_classes sc ON s.id = sc.student_id;

-- 8. RLS Policy (Tối ưu hóa performance)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Policy for managing students" ON students;
CREATE POLICY "Policy for managing students" ON students
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM student_classes sc
    WHERE sc.student_id = students.id AND is_class_teacher(sc.class_id)
  )
);

-- 9. Indexes cho performance
CREATE INDEX IF NOT EXISTS idx_students_is_deleted ON students(is_deleted);
CREATE INDEX IF NOT EXISTS idx_student_classes_order_index ON student_classes(order_index);

NOTIFY pgrst, 'reload schema';
