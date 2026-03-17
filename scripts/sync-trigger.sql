
-- 1. Xóa ràng buộc Primary Key cũ trên profiles nếu cần (Cẩn trọng: profiles hiện tại đang dùng ID làm PK)
-- Thay vào đó, chúng ta sẽ giữ ID là UUID nhưng cho phép NULL hoặc tự sinh tạm thời như đã làm.
-- Tiếp theo là tạo Trigger để tự động khớp ID khi User đăng nhập lần đầu.

-- FUNCTION: Xử lý đồng bộ ID khi có user mới trong auth.users
create or replace function public.handle_new_user_sync()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Khi một user mới đăng ký/đăng nhập qua Google (Supabase Auth)
  -- Ta tìm xem trong bảng profiles đã có email này chưa (do ta migrate từ Firebase sang trước đó)
  -- Nếu có, ta cập nhật ID của profile đó thành ID của Auth User mới
  update public.profiles
  set id = new.id,
      updated_at = now()
  where email = new.email;
  
  -- Nếu không tìm thấy profile cũ để update, ta có thể insert mới (tùy nhu cầu)
  if not found then
    insert into public.profiles (id, email, full_name, role)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'teacher');
  end if;

  return new;
end;
$$;

-- TRIGGER: Chạy sau khi nạp dữ liệu vào auth.users
drop trigger if exists on_auth_user_created_sync on auth.users;
create trigger on_auth_user_created_sync
  after insert on auth.users
  for each row execute procedure public.handle_new_user_sync();

-- CHÍNH SÁCH RLS: Nới lỏng để giáo viên có thể nhìn thấy dữ liệu lớp học (Yêu cầu của bạn)
alter table public.profiles enable row level security;
alter table public.classes enable row level security;

drop policy if exists "Allow authenticated select profiles" on public.profiles;
create policy "Allow authenticated select profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "Allow authenticated select classes" on public.classes;
create policy "Allow authenticated select classes" on public.classes
  for select using (auth.role() = 'authenticated');

drop policy if exists "Allow authenticated select students" on public.students;
create policy "Allow authenticated select students" on public.students
  for select using (auth.role() = 'authenticated');
