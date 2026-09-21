# BÁO CÁO KIỂM TOÁN ĐỘC NGHỊCH RED TEAM (ANTILOCAL ADVERSARIAL SRE & DATABASE AUDIT)
**Mã nhiệm vụ:** `TASK-PERF-ATTENDANCE`  
**Đơn vị thực hiện:** AntiLocal Red Team Specialist (Model: gemini-3.1-pro / SRE Engine)  
**Mục tiêu:** Bắt lỗi biên sâu, Race conditions, Memory leak, Data corruption, Cache invalidation, Serverless safety.  
**Thời gian:** 2026-09-21  

---

## 1. DANH MỤC CÁC RỦI RO BIÊN & LỖ HỔNG TIỀM TÀNG ĐƯỢC PHÁT HIỆN

### 🔴 RỦI RO 1 (P0 - Concurrency & Race Condition khi đồng bộ Custom Columns)
- **Kịch bản tấn công/Lỗi biên:**
  Giáo viên A mở lớp lúc 07:00 (chưa ai tích ô nào).
  Giáo viên B lúc 07:05 tích cột "Đồng phục" cho học sinh 01 và bấm Lưu.
  Giáo viên A lúc 07:06 chỉ tích cột "Nói chuyện riêng" cho học sinh 02 và bấm Lưu.
  Nếu hàm `batchSyncDailyRecords` xóa toàn bộ bản ghi của ngày hôm đó (`DELETE FROM column_records WHERE class_id = ... AND date = ...`) trước khi insert, thì thao tác lưu của Giáo viên A sẽ **vô tình xóa mất bản ghi của Giáo viên B**!
- **Chốt chặn bắt buộc (Mitigation Invariant - `INV-CONCURRENCY-01`):**
  - Tuyệt đối KHÔNG xóa mù quáng toàn bộ ngày.
  - Phải dùng cơ chế **Scoped Upsert theo ID tự sinh mang tính xác định (Deterministic ID)**:
    `id = ${columnId}_${date}_${studentCode}`
  - Với các ô được tích: Thực hiện `upsert(...)`.
  - Với các ô bị người dùng BỎ TÍCH: Chỉ xóa đúng các ID mà người dùng đó vừa thao tác gỡ bỏ (Dirty Diff Unchecked IDs), tuyệt đối không xóa các bản ghi của các cột khác hoặc các học sinh không nằm trong phạm vi thao tác.

---

### 🔴 RỦI RO 2 (P0 - Quét học sinh rỗng & Ngoại lệ PostgreSQL IN Clause)
- **Kịch bản lỗi biên:**
  Nếu một ngày đẹp trời, cả lớp 45 học sinh đều đi học đầy đủ 100%, không có học sinh nào vắng, trễ hay vi phạm.
  Mảng `data` trả về từ bảng `attendance` là mảng rỗng `[]`.
  Nếu code thực hiện:
  `dbClient.from('students').select('*').in('id', data.map(r => r.student_id))`
  thì mệnh đề `IN ()` rỗng trong một số phiên bản Supabase / PostgreSQL PostgREST có thể gây ra lỗi cú pháp `400 Bad Request` hoặc trả về kết quả không mong muốn.
- **Chốt chặn bắt buộc (Mitigation Invariant - `INV-EMPTY-SET-02`):**
  - Kiểm tra ngay tại đầu hàm:
    `if (!data || data.length === 0) return [];`
  - Trả về ngay mảng rỗng trong 0ms, không thực hiện bất kỳ lệnh query nào tiếp theo.

---

### 🟡 RỦI RO 3 (P1 - Rò rỉ bộ nhớ In-Memory Cache & Stale Cache)
- **Kịch bản lỗi:**
  Nếu lưu cache `students` hoặc `attendance` vào biến toàn cục Node.js không giới hạn kích thước hoặc không có TTL (Time-To-Live), bộ nhớ RAM của server sẽ tăng dần theo thời gian (Memory Leak).
  Nếu Admin trường đổi tên học sinh hoặc chuyển học sinh sang lớp khác, giáo viên vẫn nhìn thấy tên cũ trong bảng điểm danh.
- **Chốt chặn bắt buộc (Mitigation Invariant - `INV-CACHE-SAFETY-03`):**
  - Chỉ cache vĩnh viễn (hoặc TTL 24h) các bảng từ điển danh mục tĩnh: `attendance_statuses` (chỉ 6 dòng) và `attendance_types`.
  - Không cache dữ liệu điểm danh biến động theo thời gian thực nếu không có cơ chế `invalidateCache` khi bấm Lưu.
  - Sau khi `batchMarkAttendance` hoặc `batchSyncDailyRecords` hoàn tất, bắt buộc gọi `revalidatePath` hoặc xóa cache tương ứng.

---

### 🟡 RỦI RO 4 (P1 - Zalo Webhook Asynchronous Failure & Unhandled Rejection)
- **Kịch bản lỗi:**
  Trong `batchMarkAttendance`, Zalo Bot alert được kích hoạt trong `setTimeout(..., 50)`.
  Nếu Zalo Gateway bị ngắt kết nối mạng hoặc lỗi DNS, nếu không có khối `try...catch` bao bọc bên trong callback thì sẽ dẫn đến `UnhandledPromiseRejection` có thể làm crash tiến trình Node.js.
- **Chốt chặn bắt buộc (Mitigation Invariant - `INV-ASYNC-ALERT-04`):**
  - Toàn bộ khối Zalo alert bắt buộc phải nằm trọn trong `try...catch` độc lập, ghi log cảnh báo và không bao giờ làm gián đoạn hoặc ném lỗi ra ngoài luồng lưu điểm danh chính của giáo viên.

---

## 2. KẾT LUẬN KIỂM TOÁN CỦA RED TEAM
AntiLocal Red Team **CHẤP THUẬN VỚI ĐIỀU KIỆN (CONDITIONAL PASS)** đối với mục tiêu tối ưu hóa, với yêu cầu bắt buộc:
1. Phải áp dụng `Deterministic Upsert & Dirty Unchecked Delete` cho Custom Columns để chống Race condition ghi đè mất dữ liệu giữa các giáo viên.
2. Phải có chốt chặn `Early Return` khi lớp có mặt 100% để chống lỗi SQL `IN ()` rỗng.
3. Giữ nguyên 100% Exception-only V3 invariant.
