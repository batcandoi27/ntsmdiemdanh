# TASK-PORTAL-PAYMENT-001: Tích Hợp Sổ Theo Dõi Thu Phí, Cấu Hình STK Ngân Hàng, VietQR & Webhook Tự Động Ghi Nhận

- **Trạng thái:** `IN_PROGRESS` 🚀
- **Người thực hiện:** Antigravity (Gemini 3.7 Flash)
- **Reviewer:** ChatGPT Web Luna (OpenAI Independent Senior Architect)
- **RFC Blueprint Verdict:** `APPROVED_FOR_IMPLEMENTATION` (Score: 10/10)
- **Nhánh:** `feature/task-portal-payment-001`

---

## 1. MỤC TIÊU & BỐI CẢNH (OBJECTIVES)
Nâng cấp hệ thống điểm danh và Cổng Tra cứu Phụ huynh (`/portal`) với phân hệ theo dõi thu phí và chuyển khoản VietQR tự động 2 tầng:
1. Cho phép Giáo viên / Admin cấu hình tùy chọn **Chia sẻ Sổ theo dõi cho Phụ huynh** (`is_shared_with_parents`, mặc định: `false`).
2. Cho phép cấu hình **Số tài khoản ngân hàng (STK)** 2 cấp: Toàn trường (Admin) & Cá nhân (Từng Giáo viên).
3. Sinh mã **VietQR Napas247 động** tại `/portal` có chứa sẵn STK, Ngân hàng, Số tiền, và Nội dung đơn hàng chuẩn hóa.
4. Tự động bắt biến động số dư qua **Webhook `/api/webhook/payment`** để gạch nợ / cập nhật sổ theo dõi tức thì khi phụ huynh quét mã chuyển khoản.
5. Cung cấp chức năng xác nhận thủ công (Fallback Manual Check) cho giáo viên.

---

## 2. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [ ] **AC-1 (Zero Regression & Isolation):** Bảo toàn 100% logic và dữ liệu cũ của `attendance_records_v3`, `classes`, `students`, `timetables`.
- [ ] **AC-2 (Schema Evolution):**
  - Cập nhật bảng `columns` với `is_shared_with_parents` (boolean, default false), `payment_config` (jsonb).
  - Cập nhật bảng `profiles` với `bank_info` (jsonb).
  - Tạo bảng `payment_transactions` với Unique Index trên `transaction_id` đảm bảo tính Idempotency.
- [ ] **AC-3 (Two-Tier Bank Settings):**
  - Admin cấu hình STK Toàn trường tại Cài đặt chung.
  - Giáo viên cấu hình STK Cá nhân / Quỹ lớp với danh sách 50+ Ngân hàng Việt Nam.
- [ ] **AC-4 (Monitor Sharing Control):**
  - Mặc định các cột sổ theo dõi là `is_shared_with_parents: false`.
  - Chỉ các cột được bật chia sẻ mới hiển thị tại `/portal` ở chế độ chỉ đọc (Read-only).
- [ ] **AC-5 (Dynamic VietQR Generation):**
  - Modal VietQR tại `/portal` sinh mã chuẩn Napas247 từ `img.vietqr.io` / SVG.
  - Cú pháp nội dung chuẩn hóa: `TBC_[CLASS]_[STUDENTCODE]_[COLID]_[PERIOD]` (không dấu, viết hoa).
  - Nút sao chép 1 chạm STK, Số tiền, Nội dung, Tải ảnh QR.
- [ ] **AC-6 (Webhook Reconciliation Engine):**
  - Endpoint `/api/webhook/payment` nhận webhook biến động số dư, xác thực payload.
  - Tự động phân tích cú pháp nội dung, tìm record tương ứng và cập nhật trạng thái `completed: true` / ghi nhận số tiền.
  - Lưu chi tiết giao dịch vào `payment_transactions`.
- [ ] **AC-7 (Teacher Manual Check Fallback):**
  - Giáo viên có thể bấm xác nhận đã nộp thủ công ngay trong giao diện sổ theo dõi nếu PH nộp tiền mặt.
- [ ] **AC-8 (Zero-Mock Tests & Build):**
  - Bộ test suite tự động đạt 100% PASS.
  - Next.js production build đạt exit code 0.
