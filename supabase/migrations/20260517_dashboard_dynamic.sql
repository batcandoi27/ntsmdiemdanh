-- =========================================================================================
-- MIGRATION: Nâng cấp thuật toán Dashboard Functions - Group theo Buổi (Session)
-- Tránh nhân bản điểm phạt khi nghỉ nhiều tiết trong cùng 1 buổi.
-- Sửa lỗi type mismatch UUID/VARCHAR cho Supabase.
-- =========================================================================================

-- 0. Xóa bỏ các hàm cũ để tránh lỗi nạp chồng (Overloading error PGRST203)
DROP FUNCTION IF EXISTS get_student_risk_scores(character varying);
DROP FUNCTION IF EXISTS get_student_risk_scores(character varying, date, date);
DROP FUNCTION IF EXISTS get_class_metrics(date, date);

-- 1. FUNCTION: get_class_metrics (Đã tối ưu hóa Group theo Buổi và sửa lỗi trả về UUID)
CREATE OR REPLACE FUNCTION get_class_metrics(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (
    class_id VARCHAR,
    total_absent_k INT,
    total_late INT,
    total_violation INT,
    total_praise INT
) AS $$
BEGIN
    RETURN QUERY
    WITH session_attendance AS (
        -- Group dữ liệu chuyên cần theo Lớp + Ngày + Buổi (Sáng/Chiều) để tính là 1 lần duy nhất
        SELECT 
            a.class_id::VARCHAR as class_id, -- Cast thành VARCHAR để khớp kiểu dữ liệu trả về của TABLE
            a.date,
            COALESCE(a.session, '') as session,
            MAX(CASE WHEN st.code IN ('K', 'P') THEN 1 ELSE 0 END) as is_absent,
            MAX(CASE WHEN st.code = 'T' THEN 1 ELSE 0 END) as is_late,
            MAX(CASE WHEN st.code = 'VP' THEN 1 ELSE 0 END) as is_violation,
            MAX(CASE WHEN st.code = 'KH' THEN 1 ELSE 0 END) as is_praise
        FROM 
            attendance a
        JOIN 
            attendance_statuses st ON a.status_id = st.id
        WHERE 
            (p_start_date IS NULL OR a.date >= p_start_date)
            AND (p_end_date IS NULL OR a.date <= p_end_date)
        GROUP BY 
            a.class_id, a.date, COALESCE(a.session, '')
    )
    SELECT 
        sa.class_id::VARCHAR,
        SUM(sa.is_absent)::INT as total_absent_k,
        SUM(sa.is_late)::INT as total_late,
        SUM(sa.is_violation)::INT as total_violation,
        SUM(sa.is_praise)::INT as total_praise
    FROM 
        session_attendance sa
    GROUP BY 
        sa.class_id;
END;
$$ LANGUAGE plpgsql;

-- 2. FUNCTION: get_student_risk_scores (Đã sửa lỗi so sánh UUID = VARCHAR)
CREATE OR REPLACE FUNCTION get_student_risk_scores(
    target_class_id VARCHAR DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    total_score INT,
    absent_k_count INT,
    late_count INT,
    violation_count INT
) AS $$
BEGIN
    RETURN QUERY
    WITH session_attendance AS (
        -- Group dữ liệu chuyên cần theo Học sinh + Ngày + Buổi (Sáng/Chiều)
        SELECT 
            a.student_id,
            a.class_id,
            a.date,
            COALESCE(a.session, '') as session,
            MAX(CASE WHEN st.code IN ('K', 'P') THEN 1 ELSE 0 END) as is_absent,
            MAX(CASE WHEN st.code = 'T' THEN 1 ELSE 0 END) as is_late,
            MAX(CASE WHEN st.code = 'VP' THEN 1 ELSE 0 END) as is_violation
        FROM 
            attendance a
        JOIN 
            attendance_statuses st ON a.status_id = st.id
        WHERE 
            (target_class_id IS NULL OR a.class_id::VARCHAR = target_class_id) -- Cast class_id thành VARCHAR để khớp tham số
            AND (p_start_date IS NULL OR a.date >= p_start_date)
            AND (p_end_date IS NULL OR a.date <= p_end_date)
        GROUP BY 
            a.student_id, a.class_id, a.date, COALESCE(a.session, '')
    )
    SELECT 
        sa.student_id,
        (SUM(sa.is_absent) * 5 + 
         SUM(sa.is_late) * 2 + 
         SUM(sa.is_violation) * 3)::INT as total_score,
        SUM(sa.is_absent)::INT as absent_k_count,
        SUM(sa.is_late)::INT as late_count,
        SUM(sa.is_violation)::INT as violation_count
    FROM 
        session_attendance sa
    GROUP BY 
        sa.student_id
    HAVING 
        (SUM(sa.is_absent) * 5 + 
         SUM(sa.is_late) * 2 + 
         SUM(sa.is_violation) * 3) > 0
    ORDER BY 
        total_score DESC;
END;
$$ LANGUAGE plpgsql;
