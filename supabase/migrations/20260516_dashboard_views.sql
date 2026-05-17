-- =========================================================================================
-- MIGRATION: DASHBOARD VIEWS & AUDIT LOGS (Giai đoạn 2)
-- Đảm bảo không phá vỡ dữ liệu hiện tại, chỉ thêm Views để tổng hợp dữ liệu.
-- =========================================================================================

-- 1. VIEW: Tổng hợp chuyên cần theo ngày toàn trường
-- View này đếm số lượng vắng (K), phép (P), trễ (T) theo từng lớp trong ngày.
CREATE OR REPLACE VIEW view_attendance_daily_summary AS
SELECT 
    a.date,
    a.class_id,
    a.session,
    COUNT(CASE WHEN st.code = 'K' THEN 1 END) as absent_k_count,
    COUNT(CASE WHEN st.code = 'P' THEN 1 END) as absent_p_count,
    COUNT(CASE WHEN st.code = 'T' THEN 1 END) as late_count,
    COUNT(CASE WHEN st.code = 'VP' THEN 1 END) as violation_count
FROM 
    attendance a
JOIN 
    attendance_statuses st ON a.status_id = st.id
WHERE 
    a.period IS NULL -- Chỉ tính theo buổi, bỏ qua tính theo tiết lẻ để tránh trùng lặp
GROUP BY 
    a.date, a.class_id, a.session;

-- 2. VIEW: Bảng xếp hạng thi đua nề nếp theo lớp (Tính tổng từ đầu năm)
CREATE OR REPLACE VIEW view_class_metrics AS
SELECT 
    class_id,
    COUNT(CASE WHEN st.code = 'K' THEN 1 END) as total_absent_k,
    COUNT(CASE WHEN st.code = 'T' THEN 1 END) as total_late,
    COUNT(CASE WHEN st.code = 'VP' THEN 1 END) as total_violation,
    COUNT(CASE WHEN st.code = 'KH' THEN 1 END) as total_praise
FROM 
    attendance a
JOIN 
    attendance_statuses st ON a.status_id = st.id
WHERE 
    a.period IS NULL
GROUP BY 
    class_id;

-- 3. BẢNG AUDIT LOGS (Nhật ký thao tác)
-- Chỉ log lại các thao tác quan trọng: Sửa điểm danh, xoá điểm danh.
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật RLS cho audit_logs (Chỉ Admin/BGH mới được xem)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and BGH can view audit logs" 
    ON audit_logs FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'principal')
        )
    );

-- 4. TRIGGER: Tự động ghi Log khi có sự thay đổi trên bảng attendance
-- Giúp giảm tải việc gọi API ghi log từ Frontend
CREATE OR REPLACE FUNCTION log_attendance_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES ('attendance', OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Chỉ log nếu status bị thay đổi (Tránh log rác)
        IF (OLD.status_id IS DISTINCT FROM NEW.status_id OR OLD.note IS DISTINCT FROM NEW.note) THEN
            INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
            VALUES ('attendance', NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, NEW.marked_by);
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES ('attendance', NEW.id, 'INSERT', row_to_json(NEW)::jsonb, NEW.marked_by);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn Trigger vào bảng attendance
DROP TRIGGER IF EXISTS attendance_audit_trigger ON attendance;
CREATE TRIGGER attendance_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION log_attendance_changes();

-- 5. FUNCTION: Tính điểm rủi ro học sinh (Risk Score)
-- Điểm rủi ro = (Số ngày vắng KP * 5) + (Số ngày đi trễ * 2) + (Số lần VP * 3)
-- Function này sẽ được gọi từ Supabase RPC để trả về top học sinh nguy cơ cao
CREATE OR REPLACE FUNCTION get_student_risk_scores(target_class_id VARCHAR DEFAULT NULL)
RETURNS TABLE (
    student_id UUID,
    total_score INT,
    absent_k_count INT,
    late_count INT,
    violation_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.student_id,
        (COUNT(CASE WHEN st.code = 'K' THEN 1 END) * 5 + 
         COUNT(CASE WHEN st.code = 'T' THEN 1 END) * 2 + 
         COUNT(CASE WHEN st.code = 'VP' THEN 1 END) * 3)::INT as total_score,
        COUNT(CASE WHEN st.code = 'K' THEN 1 END)::INT as absent_k_count,
        COUNT(CASE WHEN st.code = 'T' THEN 1 END)::INT as late_count,
        COUNT(CASE WHEN st.code = 'VP' THEN 1 END)::INT as violation_count
    FROM 
        attendance a
    JOIN 
        attendance_statuses st ON a.status_id = st.id
    WHERE 
        (target_class_id IS NULL OR a.class_id = target_class_id)
        AND a.period IS NULL
    GROUP BY 
        a.student_id
    HAVING 
        (COUNT(CASE WHEN st.code = 'K' THEN 1 END) * 5 + 
         COUNT(CASE WHEN st.code = 'T' THEN 1 END) * 2 + 
         COUNT(CASE WHEN st.code = 'VP' THEN 1 END) * 3) > 0
    ORDER BY 
        total_score DESC;
END;
$$ LANGUAGE plpgsql;
