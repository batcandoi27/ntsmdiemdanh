BEGIN;

-- 1. Thêm cột is_manager vào bảng teacher_group_members
ALTER TABLE teacher_group_members ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT false;

-- 2. Cập nhật RLS để cho phép Manager có thể xem và sửa điểm danh của thành viên trong nhóm mình
-- (Phần này sẽ được xử lý chủ yếu ở tầng Logic Service để đảm bảo tính linh hoạt)

COMMIT;
