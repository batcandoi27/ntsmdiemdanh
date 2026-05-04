# 🧠 KẾ HOẠCH NÂNG CẤP HỆ THỐNG QUẢN TRỊ & ĐIỂM DANH GIÁO VIÊN (TAS) - [BẢN CUỐI]

## I. TƯ DUY THIẾT KẾ (DESIGN PHILOSOPHY)
Hệ thống kế thừa (Reuse) tối đa kiến trúc hiện tại, tập trung vào tính thực tế và khả năng mở rộng.

### 1. Nguyên tắc "Ngoại lệ" (Exception-only)
*   **Mặc định**: Giáo viên là "Có mặt" (Present).
*   **Dữ liệu**: Chỉ lưu vào DB khi có sự thay đổi trạng thái hoặc ghi chú.
*   **Logic**: `Teachers LEFT JOIN Teacher_Attendance`. Kết quả `NULL` = Có mặt.

### 2. Mô hình quét mã: Self Check-in
*   Giáo viên dùng điện thoại cá nhân (đã đăng nhập) tự quét mã QR do quản trị viên cung cấp.
*   **Lợi ích**: Tự động hóa hoàn toàn, audit chính xác từng cá nhân, không gây tắc nghẽn.

---

## II. DATABASE SCHEMA (PRODUCTION READY)

### 1. Bảng `teachers` (Hồ sơ nhân sự)
```sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  cccd TEXT UNIQUE,
  issued_date DATE,
  issued_place TEXT,
  address TEXT,
  position TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Bảng `teacher_groups` & `membership`
```sql
CREATE TABLE teacher_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('department', 'union', 'party', 'custom')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE teacher_group_members (
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  group_id UUID REFERENCES teacher_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, group_id)
);
```

### 3. Bảng `teacher_events` (Sự kiện/Cuộc họp)
```sql
CREATE TABLE teacher_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  recurrence TEXT DEFAULT 'once', -- 'once', 'daily', 'weekly', 'monthly'
  qr_secret TEXT, 
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE event_groups (
  event_id UUID REFERENCES teacher_events(id) ON DELETE CASCADE,
  group_id UUID REFERENCES teacher_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, group_id)
);
```

### 4. Bảng `teacher_attendance` (Ghi nhận điểm danh)
```sql
CREATE TABLE teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id),
  event_id UUID REFERENCES teacher_events(id),
  check_in_date DATE NOT NULL,
  status TEXT NOT NULL, -- 'present', 'absent', 'on_duty', 'substitute', 'leave'
  note TEXT,
  is_verified BOOLEAN DEFAULT false,
  marked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## III. CƠ CHẾ CHỐNG GIAN LẬN (ANTI-CHEAT)
Hệ thống sử dụng cơ chế Token động để đảm bảo tính xác thực:
1.  **QR Dynamic**: Mã QR chứa Token được mã hóa HMAC (event_id + timestamp + nonce).
2.  **Expire**: Token chỉ có hiệu lực trong **3-5 phút**.
3.  **Validation**: Server kiểm tra:
    *   Token hợp lệ (đúng secret key).
    *   Chưa hết hạn.
    *   Giáo viên đã đăng nhập đúng tài khoản.
    *   Không cho phép check-in trùng lặp (Duplicate check).

---

## IV. QUY TRÌNH TRIỂN KHAI (DEV NOTE)

### 1. Import Dữ liệu
*   Sử dụng Server Action xử lý file `.xls`.
*   Mapping đúng các trường thông tin CCCD, Email, Chức danh.

### 2. Trạng thái Điểm danh (Hybrid)
Sử dụng bộ trạng thái chuẩn để phục vụ báo cáo:
*   `present`: Có mặt.
*   `absent`: Vắng mặt.
*   `on_duty`: Đi công tác.
*   `substitute`: Người khác họp thay.
*   `leave`: Nghỉ chế độ (Thai sản, ốm...).

### 3. Cấu trúc Code
*   **API**: `/api/teacher/checkin` xử lý logic quét mã.
*   **UI**: Dashboard quản lý nhóm và tạo sự kiện tại `/admin/teachers`.
*   **Reuse**: Tận dụng `PermissionService` hiện có để gán quyền `can_manage_events`.

---
*Tài liệu này là quyết định cuối cùng, sẵn sàng cho việc triển khai code.*
