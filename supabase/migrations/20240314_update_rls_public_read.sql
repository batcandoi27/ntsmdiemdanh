-- Mở quyền xem công khai cho tất cả mọi người (Public SELECT)
-- Chỉ những yêu cầu có API key (anon) là có thể xem

-- 1. Năm học
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON public.academic_years;
CREATE POLICY "Allow public read-only access" ON public.academic_years FOR SELECT USING (true);

-- 2. Lớp học
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON public.classes;
CREATE POLICY "Allow public read-only access" ON public.classes FOR SELECT USING (true);

-- 3. Học sinh
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON public.students;
CREATE POLICY "Allow public read-only access" ON public.students FOR SELECT USING (true);

-- 4. Liên kết Học sinh - Lớp học
ALTER TABLE public.student_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON public.student_classes;
CREATE POLICY "Allow public read-only access" ON public.student_classes FOR SELECT USING (true);

-- 5. Điểm danh
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON public.attendance;
CREATE POLICY "Allow public read-only access" ON public.attendance FOR SELECT USING (true);

-- 6. Quyền ghi (INSERT/UPDATE/DELETE) - Chỉ dành cho người dùng đã đăng nhập (Authenticated)
-- Lưu ý: Thực tế bạn có thể cần siết chặt hơn tùy vai trò (Admin/Teacher)

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.attendance;
CREATE POLICY "Allow authenticated insert" ON public.attendance FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update" ON public.attendance;
CREATE POLICY "Allow authenticated update" ON public.attendance FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.attendance;
CREATE POLICY "Allow authenticated delete" ON public.attendance FOR DELETE USING (auth.role() = 'authenticated');
