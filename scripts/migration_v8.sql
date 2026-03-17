
-- =====================================================
-- MIGRATION PRO V8 - FINAL FIXED
-- =====================================================

-- 1️⃣ ADD firebase_id COLUMN (SAFE)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS firebase_id TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS firebase_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS firebase_id TEXT;

-- 2️⃣ CREATE RELATION TABLE (CLASS <-> STUDENTS)
-- Lưu ý: Chúng ta dùng tên bảng student_classes để khớp với logic hiện tại của app
CREATE TABLE IF NOT EXISTS student_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3️⃣ UNIQUE CONSTRAINT
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_class') THEN
        ALTER TABLE student_classes ADD CONSTRAINT unique_student_class UNIQUE (class_id, student_id);
    END IF;
END $$;

-- 4️⃣ PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_firebase ON profiles(firebase_id);
CREATE INDEX IF NOT EXISTS idx_classes_firebase ON classes(firebase_id);
CREATE INDEX IF NOT EXISTS idx_students_firebase ON students(firebase_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_class ON student_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_student ON student_classes(student_id);

-- 5️⃣ RELOAD SUPABASE API SCHEMA
NOTIFY pgrst, 'reload schema';
