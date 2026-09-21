# TASK CONTRACT: TỐI ƯU HÓA HIỆU NĂNG TẢI & LƯU ĐIỂM DANH
**Mã hợp đồng:** `TASK-PERF-ATTENDANCE`  
**Nhánh Git:** `feature/task-perf-attendance`  
**Ngày ký:** 2026-09-21  

---

## 1. IN-SCOPE DELIVERABLES

Các tệp được phép sửa đổi trong phạm vi nhiệm vụ:
- `src/services/attendance-v3-service.ts`
- `src/services/record-service.ts`
- `src/app/actions/common.ts`
- `src/components/attendance-sheet.tsx`
- `src/app/actions/quick-attendance.ts`

Nghiêm cấm sửa đổi các tệp ngoài phạm vi (như schema DB gốc, `.env`, `.github/`).

---

## 2. BẢNG TIÊU CHÍ NGHIỆM THU KÈM PHẢN VÍ DỤ (ACCEPTANCE TABLE - STRENGTH = 4)

| Requirement | Instrument (Test) | Plausible Counterexample / Wrong Implementation | Observation Location | Strength |
|---|---|---|---|:---:|
| **AC-01: Scoped Student Query**<br>`getClassAttendance` không bao giờ được quét toàn bộ học sinh cả trường | Kiểm tra log truy vấn hoặc số lượng rows trả về từ Supabase khi gọi `getClassAttendance` cho 1 lớp | Code vẫn gọi `select('*')` từ `students` mà không có mệnh đề `.in('id', recordStudentIds)` | `src/services/attendance-v3-service.ts` dòng ~443 | **4** |
| **AC-02: Zero-Cost Empty Class**<br>Khi lớp đi học đầy đủ 100% (không ai vắng), thời gian trả về $\le 50\text{ms}$ và 0 truy vấn dư | Gọi `getClassAttendance` cho lớp không có vắng, đo số query DB | Code vẫn query bảng `students` hoặc bảng `attendance_statuses` ngay cả khi `attendance` rỗng | `src/services/attendance-v3-service.ts` | **4** |
| **AC-03: Single Request Custom Column Sync**<br>Lưu cột tùy chỉnh từ Client chỉ phát đi đúng 1 HTTP request lên server thay vì N x M | Đếm số lượng network requests trong Network tab của trình duyệt khi bấm Lưu ở lớp 45 HS có 3 custom columns | Code vẫn dùng vòng lặp `for...students for...cols` bắn từng `saveDailyRecord` / `deleteRecord` riêng lẻ | Network Tab & `src/components/attendance-sheet.tsx` | **4** |
| **AC-04: Dirty Diff Delete Protection**<br>Không làm mất dữ liệu của giáo viên khác khi 2 giáo viên cùng tích cột khác nhau | Unit test / Smoke test mô phỏng: Lưu cột A, sau đó lưu cột B, xác nhận cột A không bị xóa | Code dùng lệnh `DELETE FROM column_records WHERE date = date` quét sạch ngày của cả lớp | `src/services/record-service.ts` | **4** |
| **AC-05: Parallel Read Pipeline**<br>Khởi tạo `AttendanceSheet` chạy song song các I/O độc lập | Đo latency `init()`: Thời gian nạp bằng $\max(T_1, T_2, T_3)$ thay vì $T_1 + T_2 + T_3 + T_4$ | Code vẫn dùng chuỗi `await` tuần tự nối tiếp nhau | `src/components/attendance-sheet.tsx` | **4** |
| **AC-06: 100% Backward Compatibility**<br>Toàn bộ format dữ liệu điểm danh, Zalo alert và exception-only model giữ nguyên vẹn | Chạy `npm run typecheck` 0 lỗi và smoke test kịch bản điểm danh thực tế | Dữ liệu bị format sai khiến giao diện Mobile hoặc Báo cáo bị vỡ | Toàn bộ ứng dụng | **4** |

---

## 3. CHỐT CHẶN AN TOÀN (INVARIANTS LOCK)
- `INV-DOC-01`: Không làm vỡ layout giao diện điểm danh hay báo cáo in ấn.
- `INV-DATA-02`: Chống ghi đè mất dữ liệu giữa các giáo viên cùng sửa cột tùy chỉnh.
- `INV-PERF-04`: Thời gian mở danh sách $\le 350\text{ms}$, thời gian lưu $\le 400\text{ms}$.
- `INV-SEC-06`: Bảo mật phân quyền giáo viên theo lớp.
