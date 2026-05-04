-- Migration cho Teacher Groups
-- Cập nhật schema để phân loại theo Cấp học và Loại nhóm (Fixed/Custom)

-- BƯỚC 1: Thêm các cột mới (Nếu chưa có)
ALTER TABLE "public"."teacher_groups"
ADD COLUMN IF NOT EXISTS "category" VARCHAR(50) DEFAULT 'department',
ADD COLUMN IF NOT EXISTS "level" VARCHAR(20) DEFAULT 'all',
ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;

-- BƯỚC 2: Xóa CHECK constraint cũ đang chặn giá trị 'fixed'
-- Tên constraint có thể là teacher_groups_type_check
ALTER TABLE "public"."teacher_groups"
DROP CONSTRAINT IF EXISTS "teacher_groups_type_check";

-- BƯỚC 3: Thêm CHECK constraint mới cho phép cả 'fixed' và 'custom'
ALTER TABLE "public"."teacher_groups"
ADD CONSTRAINT "teacher_groups_type_check"
CHECK (type IN ('fixed', 'custom', 'department', 'union', 'party'));
-- Giữ lại các giá trị cũ để các nhóm hiện có không bị lỗi

-- BƯỚC 4: Cập nhật các nhóm CŨ (nếu có) thành custom
UPDATE "public"."teacher_groups" 
SET 
  type = 'custom',
  is_system = false,
  is_active = true 
WHERE type IN ('department', 'union', 'party') OR is_system IS NULL;

-- BƯỚC 5: Seed dữ liệu mẫu chuẩn Giáo dục Việt Nam
-- Dùng chung cho cả 3 cấp (level = all)
INSERT INTO "public"."teacher_groups" ("name", "type", "category", "level", "is_system", "is_active")
VALUES
('Chi bộ', 'fixed', 'organization', 'all', true, true),
('Công đoàn', 'fixed', 'organization', 'all', true, true),
('Đoàn thanh niên', 'fixed', 'organization', 'all', true, true),
('Hội đồng trường', 'fixed', 'admin', 'all', true, true),
('Ban giám hiệu', 'fixed', 'admin', 'all', true, true),
('Tổ văn phòng', 'fixed', 'admin', 'all', true, true),
('Tổ chủ nhiệm', 'fixed', 'organization', 'all', true, true)
ON CONFLICT DO NOTHING;

-- Nhóm Tiểu học
INSERT INTO "public"."teacher_groups" ("name", "type", "category", "level", "is_system", "is_active")
VALUES
('Tổ 1', 'fixed', 'department', 'tieu_hoc', true, true),
('Tổ 2', 'fixed', 'department', 'tieu_hoc', true, true),
('Tổ 3', 'fixed', 'department', 'tieu_hoc', true, true),
('Tổ 4', 'fixed', 'department', 'tieu_hoc', true, true),
('Tổ 5', 'fixed', 'department', 'tieu_hoc', true, true)
ON CONFLICT DO NOTHING;

-- Nhóm THCS
INSERT INTO "public"."teacher_groups" ("name", "type", "category", "level", "is_system", "is_active")
VALUES
('Tổ Toán – Tin', 'fixed', 'department', 'thcs', true, true),
('Tổ Ngữ văn', 'fixed', 'department', 'thcs', true, true),
('Tổ Ngoại ngữ', 'fixed', 'department', 'thcs', true, true),
('Tổ Khoa học tự nhiên', 'fixed', 'department', 'thcs', true, true),
('Tổ Khoa học xã hội', 'fixed', 'department', 'thcs', true, true),
('Tổ Thể dục – Quốc phòng', 'fixed', 'department', 'thcs', true, true),
('Tổ Nghệ thuật – Công nghệ', 'fixed', 'department', 'thcs', true, true)
ON CONFLICT DO NOTHING;

-- Nhóm THPT
INSERT INTO "public"."teacher_groups" ("name", "type", "category", "level", "is_system", "is_active")
VALUES
('Tổ Toán', 'fixed', 'department', 'thpt', true, true),
('Tổ Ngữ văn', 'fixed', 'department', 'thpt', true, true),
('Tổ Tiếng Anh', 'fixed', 'department', 'thpt', true, true),
('Tổ Vật lí', 'fixed', 'department', 'thpt', true, true),
('Tổ Hóa học', 'fixed', 'department', 'thpt', true, true),
('Tổ Sinh học', 'fixed', 'department', 'thpt', true, true),
('Tổ Lịch sử', 'fixed', 'department', 'thpt', true, true),
('Tổ Địa lí', 'fixed', 'department', 'thpt', true, true),
('Tổ GDCD', 'fixed', 'department', 'thpt', true, true),
('Tổ Tin học', 'fixed', 'department', 'thpt', true, true),
('Tổ Công nghệ', 'fixed', 'department', 'thpt', true, true),
('Tổ Thể dục – QPAN', 'fixed', 'department', 'thpt', true, true),
('Tổ Nghệ thuật', 'fixed', 'department', 'thpt', true, true)
ON CONFLICT DO NOTHING;
