BEGIN;

-- 1. Thêm cột extra_info vào bảng teachers để lưu các trường tùy chỉnh
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS extra_info JSONB DEFAULT '{}';

-- 2. Tạo bảng cấu hình các trường thông tin giáo viên
CREATE TABLE IF NOT EXISTS teacher_field_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,          -- Tên hiển thị (Ví dụ: Đơn vị công tác)
    code TEXT UNIQUE NOT NULL,   -- Mã trường (Ví dụ: don_vi_cong_tac)
    type TEXT DEFAULT 'text',    -- Kiểu dữ liệu (text, date, select...)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Bật RLS cho bảng cấu hình
ALTER TABLE teacher_field_configs ENABLE ROW LEVEL SECURITY;

-- Cho phép authenticated users đọc/ghi cấu hình
CREATE POLICY teacher_field_configs_all ON teacher_field_configs FOR ALL TO authenticated USING (true);

-- 4. Thêm dữ liệu mẫu dựa trên file Excel của người dùng
INSERT INTO teacher_field_configs (name, code, type) 
VALUES ('Đơn vị công tác', 'don_vi_cong_tac', 'text')
ON CONFLICT (code) DO NOTHING;

COMMIT;
