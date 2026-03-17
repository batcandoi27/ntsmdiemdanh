-- FILE: scripts/add_manual_count_column.sql
-- Thêm cột sĩ số tự nhập vào bảng classes

ALTER TABLE classes ADD COLUMN IF NOT EXISTS manual_student_count INTEGER DEFAULT 0;

-- Refresh schema cache cho PostgREST
NOTIFY pgrst, 'reload schema';
