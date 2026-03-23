-- RPC lấy danh sách học sinh cho báo cáo (bao gồm cả HS đã nghỉ nếu có dữ liệu điểm danh)
CREATE OR REPLACE FUNCTION rpc_get_students_for_report(
  p_class_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS SETOF v_student_list AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM v_student_list
  WHERE class_id = p_class_id
    AND (
      (status = 'active' AND is_deleted = FALSE) -- Đang học
      OR EXISTS (
        SELECT 1 FROM attendance 
        WHERE class_id = p_class_id 
          AND student_id = v_student_list.id
          AND date BETWEEN p_start_date AND p_end_date
          AND status IN ('P', 'K', 'VPs', 'VPc') -- Có dữ liệu vắng/đi muộn
      ) -- Đã nghỉ/xóa nhưng có dữ liệu vắng trong kỳ
      OR EXISTS (
        SELECT 1 FROM attendance 
        WHERE class_id = p_class_id 
          AND student_id = v_student_list.id
          AND date BETWEEN p_start_date AND p_end_date
          AND status = 'P' -- Đã có mặt (tùy thuộc vào cách lưu 'có mặt')
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
