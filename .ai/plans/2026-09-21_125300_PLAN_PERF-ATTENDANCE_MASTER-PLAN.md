# MASTER PLAN: TỐI ƯU HÓA TOÀN DIỆN HIỆU NĂNG TẢI & LƯU ĐIỂM DANH
**Mã kế hoạch:** `2026-09-21_125300_PLAN_PERF-ATTENDANCE_MASTER-PLAN`  
**Ngày lập:** 2026-09-21  
**Hệ điều phối:** ai-dev-loop-orchestrator  
**Trọng tâm:** Khắc phục triệt để độ trễ khi mở danh sách điểm danh và khi bấm lưu điểm danh.

---

## 1. TỔNG QUAN HIỆN TRẠNG & NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)

| Phân khu | Hiện trạng phát hiện | Mức độ nghiêm trọng | Nguyên nhân kỹ thuật |
|---|---|---|---|
| **Mở danh sách điểm danh** | Mất 2.5s - 5s để hiển thị danh sách học sinh và trạng thái | **P0 (Cực kỳ nghiêm trọng)** | 1. `getClassAttendance` & `getAttendanceByClasses` quét toàn bộ bảng `students` của toàn trường (1000+ dòng) thay vì chỉ lấy học sinh của lớp.<br>2. Thác nước tuần tự 4 chặng (`getClassAndStudents` -> `getColumns` -> `getRecords` -> `getClassAttendance`).<br>3. `attendance_statuses` bị query lặp lại mỗi request. |
| **Lưu điểm danh** | Nút lưu xoay từ 5s - 15s, có thể nghẽn socket trình duyệt | **P0 (Cực kỳ nghiêm trọng)** | 1. Vòng lặp N học sinh * M cột custom bắn từ 50 - 150 request riêng lẻ (`saveDailyRecord` / `deleteRecord`) đồng thời từ trình duyệt.<br>2. 3 lệnh DELETE và 1 lệnh UPSERT trong `batchMarkAttendance` chạy tuần tự. |

---

## 2. 5 CHIẾN LƯỢC TỐI ƯU HÓA MASTER

### Chiến lược 1: Triệt tiêu Unbounded Full Table Scan ở Backend
- Trong `getClassAttendance`: Thay vì `dbClient.from('students').select('*')` không filter, chỉ lấy các student IDs nằm trong danh sách bản ghi điểm danh `attendance` (`data.map(r => r.student_id)`).
- Bảng từ điển `attendance_statuses` và `attendance_types` được lưu trong bộ nhớ đệm In-Memory của server Node.js.

### Chiến lược 2: Song song hóa khởi tạo (Parallel Init Pipeline)
- Dùng `Promise.all` đồng thời nạp:
  1. Lớp & Học sinh (`getClassAndStudents`)
  2. Cột tuỳ chỉnh (`getColumnsByFrequency`)
  3. Dữ liệu điểm danh ngày hiện tại (`getClassAttendance`)
- Giảm thời gian chờ từ dạng tổng $\sum T_i$ xuống $\max(T_i)$.

### Chiến lược 3: Gom cụm Bulk API cho Custom Columns (Triệt tiêu 135 Request)
- Xây dựng `batchSyncDailyRecords(classId, date, records)`:
  - Client chỉ gửi 1 payload JSON duy nhất lên server.
  - Server thực hiện bulk upsert và bulk delete trong 1 transaction / query ngắn.
  - Số HTTP request giảm từ 135 xuống 1!

### Chiến lược 4: Song song hóa các thao tác ghi trong `batchMarkAttendance`
- Các lệnh xóa reset theo loại (chuyên cần, vi phạm, khen thưởng) được gom thực thi song song `Promise.all`.
- Tận dụng `statusCodeMap` đã cache trong bộ nhớ.

### Chiến lược 5: Bảo toàn 100% logic nghiệp vụ (Strictly Preserve Existing Logic)
- Giữ nguyên cấu trúc dữ liệu V3 Exception-Only.
- Giữ nguyên Zalo webhook alerting.
- Không thay đổi bảng hay trường nào trong database PostgreSQL Supabase.

---

## 3. CHỈ SỐ CAM KẾT (SLO / PERFORMANCE TARGETS)

- **Thời gian mở danh sách điểm danh:** Giảm từ ~3.500ms xuống **$\le$ 400ms** (Nhanh gấp ~9 lần).
- **Thời gian lưu điểm danh:** Giảm từ ~8.000ms xuống **$\le$ 500ms** (Nhanh gấp ~16 lần).
- **Số lượng Network Calls khi lưu:** Giảm từ 135 calls xuống **2 calls** (1 cho điểm danh + 1 cho cột custom).
- **Khả năng chịu tải:** 0 nguy cơ nghẽn socket trình duyệt.
