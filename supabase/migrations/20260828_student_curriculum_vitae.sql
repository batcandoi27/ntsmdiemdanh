-- =============================================================================
-- MIGRATION: STUDENT CURRICULUM VITAE (SƠ YẾU LÝ LỊCH HỌC SINH 100% CHUẨN MẪU)
-- Tuân thủ 6 Enterprise Architecture Invariants (Zero-Regression for Attendance)
-- =============================================================================

-- 1. BẢNG SƠ YẾU LÝ LỊCH HỌC SINH (STUDENT CURRICULUM VITAE)
CREATE TABLE IF NOT EXISTS student_curriculum_vitae (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001', -- Multi-tenant Isolation
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    schema_version INT NOT NULL DEFAULT 1,
    version INT NOT NULL DEFAULT 1, -- Optimistic Locking counter
    
    -- Dữ liệu khai báo đầy đủ của Phụ huynh (JSONB có cấu trúc)
    profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Fast query index columns (Trích xuất để tra cứu & lọc nhanh)
    student_name_upper VARCHAR(255),
    citizen_id VARCHAR(20),
    health_notes TEXT,
    policy_category VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    
    -- Trạng thái workflow: 'draft' | 'submitted' | 'verified' | 'needs_update'
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Tác nghiệp của GVCN (Tách riêng khỏi profile_data để tránh race condition)
    teacher_notes TEXT,
    teacher_verified_at TIMESTAMPTZ,
    teacher_verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Thời gian phụ huynh nộp
    parent_submitted_at TIMESTAMPTZ,
    parent_submitted_by VARCHAR(100),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, academic_year)
);

-- Index tra cứu tối ưu
CREATE INDEX IF NOT EXISTS idx_scv_school_class_status ON student_curriculum_vitae(school_id, class_id, status);
CREATE INDEX IF NOT EXISTS idx_scv_student_year ON student_curriculum_vitae(student_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_scv_citizen_id ON student_curriculum_vitae(citizen_id);

-- 2. BẢNG DANH MỤC GỢI Ý CHO ADMIN CP (ADMIN CATALOGS)
CREATE TABLE IF NOT EXISTS admin_catalogs (
    id VARCHAR(50) NOT NULL, -- 'ethnicities', 'religions', 'hospitals', 'policy_types', 'provinces'
    school_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    name VARCHAR(100) NOT NULL,
    description TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(id, school_id)
);

-- 3. BẢNG ĐỊNH NGHĨA TRƯỜNG TÙY CHỈNH CỦA GVCN (TEACHER CUSTOM FIELDS)
CREATE TABLE IF NOT EXISTS teacher_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    field_key VARCHAR(50) NOT NULL,
    field_label VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL DEFAULT 'text', -- 'text' | 'select' | 'checkbox' | 'number'
    options JSONB, -- Cho field_type = 'select' e.g. ["Xe đạp", "Xe buýt", "Cha mẹ đưa đón"]
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    max_length INT DEFAULT 250,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Soft delete invariant
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(class_id, field_key)
);

-- Seed danh mục mẫu ban đầu cho Admin Catalogs
INSERT INTO admin_catalogs (id, school_id, name, description, items)
VALUES
  ('ethnicities', '00000000-0000-0000-0000-000000000001', 'Danh mục Dân tộc', 'Danh mục 54 dân tộc Việt Nam', '[
    {"code": "kinh", "label": "Kinh", "is_default": true, "sort_order": 1, "is_active": true},
    {"code": "hoa", "label": "Hoa", "is_default": false, "sort_order": 2, "is_active": true},
    {"code": "cham", "label": "Chăm", "is_default": false, "sort_order": 3, "is_active": true},
    {"code": "khmer", "label": "Khmer", "is_default": false, "sort_order": 4, "is_active": true},
    {"code": "tay", "label": "Tày", "is_default": false, "sort_order": 5, "is_active": true},
    {"code": "nung", "label": "Nùng", "is_default": false, "sort_order": 6, "is_active": true},
    {"code": "muong", "label": "Mường", "is_default": false, "sort_order": 7, "is_active": true},
    {"code": "hmong", "label": "H''Mông", "is_default": false, "sort_order": 8, "is_active": true},
    {"code": "other", "label": "Khác", "is_default": false, "sort_order": 99, "is_active": true}
  ]'::jsonb),
  ('religions', '00000000-0000-0000-0000-000000000001', 'Danh mục Tôn giáo', 'Danh mục các tôn giáo chính', '[
    {"code": "none", "label": "Không", "is_default": true, "sort_order": 1, "is_active": true},
    {"code": "buddhism", "label": "Phật giáo", "is_default": false, "sort_order": 2, "is_active": true},
    {"code": "catholicism", "label": "Công giáo", "is_default": false, "sort_order": 3, "is_active": true},
    {"code": "protestantism", "label": "Tin Lành", "is_default": false, "sort_order": 4, "is_active": true},
    {"code": "caodaism", "label": "Cao Đài", "is_default": false, "sort_order": 5, "is_active": true},
    {"code": "hoahao", "label": "Hòa Hảo", "is_default": false, "sort_order": 6, "is_active": true},
    {"code": "islam", "label": "Hồi giáo", "is_default": false, "sort_order": 7, "is_active": true},
    {"code": "other", "label": "Khác", "is_default": false, "sort_order": 99, "is_active": true}
  ]'::jsonb),
  ('hospitals', '00000000-0000-0000-0000-000000000001', 'Nơi đăng ký KCB & Bệnh viện nơi sinh', 'Các bệnh viện KCB BHYT phổ biến', '[
    {"code": "bv_q5", "label": "Bệnh viện Quận 5 - TP. Hồ Chí Minh", "is_default": true, "sort_order": 1, "is_active": true},
    {"code": "bv_hungvuong", "label": "Bệnh viện Hùng Vương", "is_default": false, "sort_order": 2, "is_active": true},
    {"code": "bv_tudu", "label": "Bệnh viện Từ Dũ", "is_default": false, "sort_order": 3, "is_active": true},
    {"code": "bv_nhidong1", "label": "Bệnh viện Nhi Đồng 1", "is_default": false, "sort_order": 4, "is_active": true},
    {"code": "bv_nhidong2", "label": "Bệnh viện Nhi Đồng 2", "is_default": false, "sort_order": 5, "is_active": true},
    {"code": "bv_choray", "label": "Bệnh viện Chợ Rẫy", "is_default": false, "sort_order": 6, "is_active": true},
    {"code": "bv_thongnhat", "label": "Bệnh viện Thống Nhất", "is_default": false, "sort_order": 7, "is_active": true},
    {"code": "ttyt_q5", "label": "Trung tâm Y tế Quận 5", "is_default": false, "sort_order": 8, "is_active": true}
  ]'::jsonb)
ON CONFLICT (id, school_id) DO NOTHING;
