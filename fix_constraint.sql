-- Bước 1: Xóa constraint giới hạn cũ
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_upsert_key;

-- Bước 2: Xóa luôn các constraint mặc định có thể gây conflict (nếu có)
DO $$ 
DECLARE
    r record;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.attendance'::regclass 
        AND (conname LIKE 'attendance_student_id%' OR conname = 'attendance_upsert_key')
    LOOP
        EXECUTE 'ALTER TABLE public.attendance DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Bước 3: Tạo lại constraint mới CHÍNH XÁC bao gồm cả type_id
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_upsert_key 
UNIQUE (student_id, type_id, date, period, session);
