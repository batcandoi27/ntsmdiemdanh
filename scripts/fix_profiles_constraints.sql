-- Thêm ràng buộc UNIQUE cho full_name trong bảng profiles 
-- để hỗ trợ lệnh UPSERT trong script migration.
ALTER TABLE profiles ADD CONSTRAINT profiles_full_name_unique UNIQUE (full_name);
