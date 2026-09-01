# TASK CONTRACT: PHASE 4 — HOMEROOM & PORTAL REFINEMENTS & BEAUTIFIER ENGINE

- **Task ID:** `TASK-PHASE4-REFINEMENT-001`
- **Owner:** Antigravity (Implementer) & ChatGPT Web (Independent Reviewer)
- **Status:** `IN_PROGRESS`
- **Priority:** `CRITICAL`

## 1. MỤC TIÊU & DANH SÁCH HẠNG MỤC CẦN SỬA ĐỔI / NÂNG CẤP

1. **Sửa Lỗi `NaN buổi` Vắng:**
   - Đảm bảo `excusedCount`, `unexcusedCount`, `excusedAbsenceCount`, `unexcusedAbsenceCount` luôn được khởi tạo số nguyên $\ge 0$ trong `getStudentEducationalProfile`.
   - Bổ sung safe null coalescing & `isNaN` check trên giao diện `src/app/homeroom/students/page.tsx`.

2. **Khắc Phục Nút Nổi Bị Che (Floating Quick Capture Button):**
   - Đẩy vị trí lên `bottom-14 right-8 z-50` và bổ sung `pb-24` cho layout container để nút nổi không bao giờ che đè thanh footer hoặc nội dung bảng.

3. **Mẫu Điền Nhanh (Quick Tags / Presets) Cho Tất Cả Modal Nhập Liệu:**
   - Modal "Ghi Nhật Ký Liên Hệ Phụ Huynh": Thêm 5 mẫu nội dung trao đổi + 4 mẫu biện pháp thống nhất gia đình.
   - Modal "Ghi Nhận Sự Việc GVCN": Thêm danh sách quick chip lý do/hành vi.
   - Modal "Kiểm Duyệt Ban Cán Sự Lớp": Thêm quick chip duyệt/ghi chú.

4. **Sắp Xếp Học Sinh Tăng Dần Theo Mã Học Sinh (Natural Numeric Sort):**
   - Triển khai hàm `compareStudentCodes` (sử dụng `localeCompare` với `{ numeric: true }` để `8A13_1` < `8A13_2` < ... < `8A13_10` < `8A13_43`).
   - Áp dụng trên toàn bộ: DB Adapter, Student Service, Trang Hồ Sơ, Trang Tổ Chức, Trang In Ấn và API Export DOCX.

5. **Đồng Bộ Điểm Danh Phép Chuẩn Sáng/Chiều (Session Handling):**
   - Bổ sung trường `session` (`morning` | `afternoon` | `all_day`) vào `LeaveRequest`.
   - Khi duyệt đơn nghỉ phép: Đồng bộ nguyên tử vào bảng `attendance_records_v3` đúng session mà không xóa nhầm buổi còn lại.

6. **Gói Gọn In Ấn Trong Khổ Giấy A4 Chuẩn:**
   - Sửa lỗi lặp từ `"Lớp Lớp 8A13"` $\rightarrow$ `"Lớp 8A13"`.
   - Tinh chỉnh CSS `@media print` và padding bảng biểu để văn bản nằm trọn vẹn, thanh lịch trong khổ A4.

7. **Bộ Máy Xuất Kịch Bản Sinh Hoạt Lớp (.DOCX & .PPTX):**
   - Tích hợp công nghệ Beautifier Engine từ `MARKDOWN_TO_DOCX_BEAUTIFIER_GUIDE.md` (Theme Modern Emerald & Executive Navy, Heading có gạch màu, Header/Footer đánh số `Trang X / Y`, Chữ ký căn phải).
   - Tích hợp xuất Presentation Slide 16:9 (`.pptx`) chuyên nghiệp từ kịch bản sinh hoạt lớp.
   - Thêm nút tải trực tiếp trong `WeeklyMeetingModal`.

## 2. KẾ HOẠCH KIỂM ĐỊNH (VERIFICATION PLAN)
- Viết test script `scratch/test-phase4-refinements.mjs` kiểm tra sorting, session sync, attendance calculations và docx/pptx builders.
- `npm run lint`: 0 errors.
- `npm run build`: 34/34 routes pass.
- Gửi gói review sang ChatGPT Web qua Bridge 17841 và lấy phê duyệt `🟢 APPROVED`.
