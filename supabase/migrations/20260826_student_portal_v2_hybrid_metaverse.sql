-- =============================================================================
-- MIGRATION: STUDENT PORTAL v2.2 (HYBRID ARCHITECTURE, METAVERSE 2D, SVG PETS)
-- =============================================================================

-- 1. BẢNG THÚ CƯNG SVG & TIẾN HÓA (STUDENT PETS)
CREATE TABLE IF NOT EXISTS student_pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    anonymous_name VARCHAR(100) NOT NULL, -- VD: 'Phượng Hoàng Băng #821'
    anonymous_avatar_code VARCHAR(100) NOT NULL DEFAULT 'cosmic_egg',
    evolution_branch VARCHAR(50) DEFAULT 'cosmic', -- 'cosmic' | 'nature' | 'cyber'
    level INT DEFAULT 0, -- 0: Trứng nguyên vẹn; 1..4: Trứng nứt; 5+: Nở linh vật
    current_xp INT DEFAULT 0,
    vitality_percent INT DEFAULT 100, -- 0..100 (Giảm sau 7 ngày lười)
    streak_days INT DEFAULT 0,
    last_checkin_date DATE,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    is_hibernating BOOLEAN DEFAULT FALSE, -- Bị ngủ đông & trừ lùi cấp độ sau 30 ngày
    total_coins INT DEFAULT 0,
    custom_svg_data TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, class_id)
);

-- 2. BẢNG TỦ ĐỒ & TRANG BỊ THÚ CƯNG (PET INVENTORY)
CREATE TABLE IF NOT EXISTS student_pet_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES student_pets(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- 'skin' | 'badge' | 'aura' | 'theme'
    item_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    rarity VARCHAR(20) DEFAULT 'common', -- 'common' | 'rare' | 'epic' | 'legendary'
    is_equipped BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG NGÂN HÀNG NHIỆM VỤ ĐA MÔN HỌC (DYNAMIC QUEST BANK)
CREATE TABLE IF NOT EXISTS student_quest_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(50) DEFAULT 'THCS-TBC',
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE, -- NULL nếu là nhiệm vụ toàn trường
    subject_code VARCHAR(50) DEFAULT 'ALL', -- 'MATH' | 'HOMEROOM' | 'LITERATURE' | 'SCIENCE' | 'ENGLISH' | 'ALL'
    category VARCHAR(50) NOT NULL, -- 'academic' | 'habit_life' | 'social_peer' | 'metacognition' | 'life_skills'
    cadence VARCHAR(30) DEFAULT 'daily', -- 'daily' | 'alternate' | 'weekly_boss'
    estimated_minutes INT DEFAULT 5,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    week_timeline_start INT DEFAULT 1, -- Tuần bắt đầu mở (1 - 35)
    week_timeline_end INT DEFAULT 35,
    reward_xp INT DEFAULT 50,
    reward_coins INT DEFAULT 10,
    google_form_url TEXT,
    evidence_type VARCHAR(30) DEFAULT 'form', -- 'form' | 'image' | 'video' | 'text' | 'hybrid'
    requires_anchor BOOLEAN DEFAULT TRUE, -- Yêu cầu 4 Neo dữ kiện chống văn mẫu AI
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG OVERRIDES NHIỆM VỤ CỦA GIÁO VIÊN (TEACHER QUEST OVERRIDES)
CREATE TABLE IF NOT EXISTS teacher_quest_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES student_quest_bank(id) ON DELETE CASCADE,
    override_action VARCHAR(30) NOT NULL, -- 'disable' | 'enable' | 'custom_reward' | 'replace'
    custom_title VARCHAR(255),
    custom_xp INT,
    custom_coins INT,
    teacher_id UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, quest_id)
);

-- 5. BẢNG TIẾN ĐỘ & HẬU KIỂM MINH CHỨNG (QUEST COMPLETIONS & POST-AUDIT)
CREATE TABLE IF NOT EXISTS student_quest_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id UUID NOT NULL REFERENCES student_quest_bank(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    submission_hash VARCHAR(64) UNIQUE, -- sha256(student_id + quest_id + date) chống trùng lặp
    proof_urls TEXT[], -- Link ảnh Drive / Video
    action_anchor VARCHAR(255), -- Neo 1: Hành động cụ thể
    temporal_anchor VARCHAR(255), -- Neo 2: Thời gian & địa điểm thực
    physical_anchor_verified BOOLEAN DEFAULT FALSE, -- Neo 3: Tờ giấy ghi bí danh Pet
    personal_reflection TEXT, -- Neo 4: Cảm xúc 1-2 câu thật
    score_achieved NUMERIC(5, 2) DEFAULT 10.0,
    xp_awarded INT NOT NULL,
    coins_awarded INT NOT NULL,
    status VARCHAR(30) DEFAULT 'auto_completed', -- 'auto_completed' | 'verified' | 'revoked'
    audit_note TEXT,
    audited_by UUID REFERENCES profiles(id),
    audited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SỔ CÁI BẤT BIẾN XP & TIỀN TỆ (IMMUTABLE XP LEDGER)
CREATE TABLE IF NOT EXISTS student_xp_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES student_pets(id) ON DELETE CASCADE,
    delta_xp INT NOT NULL, -- +50 hoặc -50 (khi revoke)
    delta_coins INT NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'quest_completion' | 'daily_streak' | 'coop_reward' | 'audit_revoke'
    reference_id UUID, -- Reference tới student_quest_completions
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BẢNG TỌA ĐỘ THẾ GIỚI ẢO METAVERSE (CLASSROOM WORLD GRIDS)
CREATE TABLE IF NOT EXISTS student_world_plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES student_pets(id) ON DELETE CASCADE,
    grid_x INT NOT NULL, -- 0..7
    grid_y INT NOT NULL, -- 0..7
    plot_theme VARCHAR(50) DEFAULT 'meadow',
    building_item_code VARCHAR(100) DEFAULT 'cozy_cabin',
    decorations JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, grid_x, grid_y),
    UNIQUE(class_id, pet_id)
);

-- 8. BẢNG CỬA HÀNG VẬT PHẨM METAVERSE (VIRTUAL SHOP ITEMS)
CREATE TABLE IF NOT EXISTS virtual_shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code VARCHAR(100) UNIQUE NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'building' | 'decoration' | 'theme'
    price_coins INT NOT NULL DEFAULT 20,
    svg_asset_data TEXT NOT NULL,
    required_level INT DEFAULT 1,
    is_available BOOLEAN DEFAULT TRUE
);

-- 9. BẢNG TIẾN TRÌNH CO-OP TÀU VŨ TRỤ LỚP (CLASS CO-OP GOALS)
CREATE TABLE IF NOT EXISTS student_coop_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    period_key VARCHAR(20) NOT NULL, -- '2026-W35'
    target_xp INT NOT NULL DEFAULT 5000,
    current_xp INT NOT NULL DEFAULT 0,
    reward_description TEXT NOT NULL,
    is_unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TẠO CÁC MẪU VẬT PHẨM MẶC ĐỊNH TRONG SHOP
INSERT INTO virtual_shop_items (item_code, item_name, category, price_coins, svg_asset_data, required_level)
VALUES
('cozy_cabin', 'Nhà Gỗ Nhỏ Ấm Áp', 'building', 0, '<svg viewBox="0 0 100 100"><polygon points="50,15 90,45 10,45" fill="#e76f51"/><rect x="25" y="45" width="50" height="45" fill="#f4a261"/><rect x="42" y="60" width="16" height="30" fill="#264653"/></svg>', 1),
('space_pod', 'Trạm Không Gian Alpha', 'building', 50, '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#48cae4"/><circle cx="50" cy="50" r="20" fill="#0077b6"/><rect x="40" y="85" width="20" height="10" fill="#03045e"/></svg>', 5),
('magic_tree', 'Cây Tri Thức Phát Sáng', 'decoration', 20, '<svg viewBox="0 0 100 100"><rect x="45" y="55" width="10" height="35" fill="#8d6e63"/><circle cx="50" cy="40" r="30" fill="#52b788"/><circle cx="40" cy="30" r="8" fill="#d8f3dc"/></svg>', 2),
('gold_trophy', 'Bục Cúp Vàng Học Tập', 'decoration', 40, '<svg viewBox="0 0 100 100"><polygon points="30,20 70,20 60,60 40,60" fill="#ffd166"/><rect x="45" y="60" width="10" height="20" fill="#f48c06"/><rect x="35" y="80" width="30" height="10" fill="#6a040f"/></svg>', 3)
ON CONFLICT (item_code) DO NOTHING;
