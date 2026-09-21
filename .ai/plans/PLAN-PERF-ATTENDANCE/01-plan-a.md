# PLAN A: KIẾN TRÚC TỐI ƯU HÓA HIỆU NĂNG ĐIỂM DANH (ANTIGRAVITY CODE LEAD)
**Mã nhiệm vụ:** `TASK-PERF-ATTENDANCE`  
**Tác giả:** Antigravity (Gemini IDE Code Lead)  
**Thời gian:** 2026-09-21  

---

## 1. PHÂN TÍCH HIỆN TRẠNG & ĐIỂM NGHẼN BỞI ANTIGRAVITY

### A. Phân tích luồng đọc (Read Path)
- **Tệp nguồn:** `src/services/attendance-v3-service.ts` -> `getClassAttendance` & `getAttendanceByClasses`
- **Lỗi kiến trúc:** Lệnh `dbClient.from('students').select('id, student_code, full_name')` không có mệnh đề `WHERE` lọc theo lớp hay theo học sinh liên quan. Khi số lượng học sinh trong trường lên đến 1.000 - 3.000 em, mỗi lần mở bảng điểm danh 1 lớp (40 em) sẽ kéo toàn bộ danh sách toàn trường về, gây tắc nghẽn băng thông và lãng phí RAM.
- **Thác nước khởi tạo:** Trong `src/components/attendance-sheet.tsx`, các lời gọi API:
  - `getClassAndStudents`
  - `getColumnsByFrequency`
  - `getDailyRecords`
  - `getClassAttendance`
  được gọi nối tiếp nhau tuần tự, khiến tổng thời gian chờ bị cộng dồn ($T_{total} = \sum T_i$).

### B. Phân tích luồng ghi (Write Path)
- **Tệp nguồn:** `src/components/attendance-sheet.tsx` -> `handleSave`
- **Lỗi kiến trúc:** Vòng lặp duyệt từng học sinh và từng cột tùy chỉnh:
  ```typescript
  for (const student of students) {
    for (const col of customColumns) {
      if (isChecked) customUpdates.push(saveDailyRecord(...));
      else customUpdates.push(deleteRecord(...));
    }
  }
  await Promise.all(customUpdates);
  ```
  Với 45 học sinh và 3 cột tùy chỉnh, client phát đi **135 HTTP request riêng lẻ** tới Supabase. Trình duyệt bị nghẽn socket kết nối tối đa (thường là 6 kết nối đồng thời trên mỗi domain), khiến nút lưu xoay tròn từ 5 đến 15 giây.
- **Xóa tuần tự trong `batchMarkAttendance`:** 3 lệnh delete theo loại (chuyên cần, vi phạm, khen thưởng) chạy nối tiếp.

---

## 2. GIẢI PHÁP ĐỀ XUẤT CỦA PLAN A

### Đề xuất 1: Scoped Student Query & In-Memory Dictionary Cache
1. Trong `getClassAttendance`:
   - Nếu bảng `attendance` của lớp trong ngày/buổi đó trống (toàn bộ học sinh đi học đầy đủ): Trả về `[]` ngay lập tức mà không cần query thêm bảng `students`.
   - Nếu có học sinh vắng/trễ/vi phạm: Chỉ lấy thông tin học sinh theo danh sách ID có trong bản ghi:
     `.in('id', Array.from(new Set(data.map(r => r.student_id))))`
2. Tạo In-Memory Cache (hoặc module-level Map với TTL 24h) cho bảng `attendance_statuses` và `attendance_types`.

### Đề xuất 2: Song song hóa quá trình nạp dữ liệu ở `AttendanceSheet`
- Tái cấu trúc hàm `init()` trong `AttendanceSheet`:
  ```typescript
  const [classAndStudentsRes, colsRes, allRecordsRes] = await Promise.all([
    getClassAndStudents(classId),
    getColumnsByFrequency(classId, 'daily'),
    getClassAttendance(classId, date, session)
  ]);
  ```
- Nạp song song các bản ghi của các cột tùy chỉnh sau khi đã có danh mục cột.

### Đề xuất 3: Xây dựng Server Action Batch Sync cho Custom Columns
- Tạo hàm `batchSyncDailyRecords(classId, date, recordsToSave, recordsToDelete)` trong `src/services/record-service.ts` hoặc server action tương ứng:
  - Thay vì 135 request từ client, client chỉ gửi **1 request duy nhất** chứa danh sách ô được tích.
  - Server thực hiện:
    1. Xóa các record cũ của lớp trong ngày theo danh sách `columnId`.
    2. Bulk upsert mảng các record được tích chọn.
  - Giảm 135 HTTP requests xuống đúng 1 request!

### Đề xuất 4: Song song hóa các thao tác xóa trong `batchMarkAttendance`
- Gom 3 lệnh delete theo loại (`studentsToResetAttendance`, `studentsToResetViolation`, `studentsToResetReward`) chạy đồng thời bằng `Promise.all`.

---

## 3. NGUYÊN TẮC BẤT BIẾN (INVARIANTS)
- **INV-LOGIC-01:** Bảo toàn 100% logic Exception-Only V3 (học sinh có mặt = mặc định, không lưu DB).
- **INV-ALERT-02:** Bảo toàn 100% webhook gửi tin Zalo Bot thông báo phụ huynh bất đồng bộ.
- **INV-SCHEMA-03:** Không thay đổi bất kỳ bảng, cột hay Foreign Key nào trong cơ sở dữ liệu Supabase.
