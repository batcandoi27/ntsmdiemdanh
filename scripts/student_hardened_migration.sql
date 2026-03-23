-- =====================================================
-- HARDENED STUDENT MANAGEMENT MIGRATION (V1 APPROVED)
-- =====================================================

-- 1. Đảm bảo có cột deleted_at
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 2. RPC Upsert Student với Bảo vệ PII (Safe Write-back)
CREATE OR REPLACE FUNCTION rpc_upsert_student(
  p_student_id UUID,
  p_class_id UUID,
  p_payload JSONB
) RETURNS VOID AS $$
DECLARE
  v_gov_id TEXT;
  v_old_gov_id TEXT;
  v_exists BOOLEAN;
BEGIN
  v_gov_id := p_payload->>'gov_id';
  
  -- Kiểm tra xem học sinh đã tồn tại chưa
  SELECT EXISTS(SELECT 1 FROM students WHERE id = p_student_id) INTO v_exists;
  
  IF NOT v_exists THEN
    -- Tạo mới: Không cho phép PII bị mask
    IF v_gov_id LIKE '***%' THEN
      RAISE EXCEPTION 'Invalid Gov ID: Cannot create new record with masked data';
    END IF;
  ELSE
    -- Cập nhật: Nếu nhận được mã đã mask (***), giữ nguyên giá trị cũ trong DB
    SELECT gov_id FROM students WHERE id = p_student_id INTO v_old_gov_id;
    IF v_gov_id LIKE '***%' THEN
      v_gov_id := v_old_gov_id;
    END IF;
  END IF;

  -- 2.1 Cập nhật bảng students
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
    p_payload->>'student_code',
    p_payload->>'full_name',
    p_payload->>'gender',
    (p_payload->>'birthday')::DATE,
    v_gov_id,
    p_payload->>'ethnicity',
    COALESCE(p_payload->>'status', 'active'),
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    student_code = EXCLUDED.student_code,
    full_name = EXCLUDED.full_name,
    gender = EXCLUDED.gender,
    birthday = EXCLUDED.birthday,
    gov_id = v_gov_id, -- Sử dụng v_gov_id đã xử lý mask
    ethnicity = EXCLUDED.ethnicity,
    status = EXCLUDED.status,
    is_deleted = FALSE,
    updated_at = NOW();

  -- 2.2 Cập nhật bảng mapping student_classes
  INSERT INTO student_classes (student_id, class_id, order_index)
  VALUES (p_student_id, p_class_id, (p_payload->>'order_index')::INT4)
  ON CONFLICT (student_id, class_id) DO UPDATE SET
    order_index = EXCLUDED.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. RPC Soft Delete riêng biệt
CREATE OR REPLACE FUNCTION rpc_soft_delete_student(p_student_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE students SET 
    is_deleted = TRUE, 
    deleted_at = NOW() 
  WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Composite Indexes cho Performance (Index-only scan)
CREATE INDEX IF NOT EXISTS idx_student_status_composite ON students (is_deleted, status, id);
CREATE INDEX IF NOT EXISTS idx_sc_composite ON student_classes (class_id, student_id, order_index);

-- 5. Secure View cập nhật cho phép truy xuất trạng thái deleted
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
    s.is_deleted,
    s.deleted_at
FROM students s
JOIN student_classes sc ON s.id = sc.student_id;

NOTIFY pgrst, 'reload schema';
