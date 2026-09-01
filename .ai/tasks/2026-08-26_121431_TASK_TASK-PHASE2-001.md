# TASK CONTRACT: TASK-PHASE2-001
**Title:** Phase 2 - Cooperation, Class Cadre Delegation Pipeline & SePay Payment Auto-Reconciliation
**Modules:**
- `src/services/homeroom-service.ts`
- `src/app/homeroom/cooperation/page.tsx`
- `src/app/homeroom/organization/page.tsx`
- `src/app/api/webhook/payment/route.ts`
- `src/components/portal/vietqr-payment-modal.tsx`
**Phase:** 2 - Cooperation & Workflow Engine

---

## 1. MỤC TIÊU (GOAL)
Xây dựng động cơ phối hợp đa chiều giữa GVCN, Giáo viên Bộ môn (GVBM), Ban Cán sự lớp và Hệ thống Thu phí Tự động:
1. **Subject Teacher Cooperation Feed (GVBM):**
   - API & Giao diện thu thập ý kiến, nhận xét tiết học và ghi nhận học sinh từ GVBM.
   - GVCN có thể Acknowledge (Đã xem) hoặc 1-Click chuyển thành sự kiện nề nếp lớp.
2. **Class Cadre Delegation Pipeline (Ban Cán Sự):**
   - Cho phép Ban Cán sự (Lớp trưởng, 4 Tổ trưởng) nhập nhật ký thi đua nề nếp tổ.
   - Pipeline kiểm duyệt an toàn: Ghi nhận của Ban Cán sự phải qua trạng thái `pending_review` và chỉ cộng/trừ điểm chính thức khi GVCN bấm duyệt (1-Click Batch Approval).
3. **SePay Webhook & Auto-Reconciliation Engine (Đối soát Thu phí Tự động):**
   - Webhook tiếp nhận biến động số dư từ SePay/VietQR với khóa Idempotency `provider_transaction_id`.
   - Tự động phân tích cú pháp mã nội dung chuyển khoản (`TBC <MãLớp> <MãHS> <MãKhoảnThu>`) và gạch nợ tự động trong bảng theo dõi `records`.
   - Cung cấp tính năng 1-Click sao chép cấu hình Webhook và kiểm tra trạng thái thanh toán theo thời gian thực.

---

## 2. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [ ] Bổ sung types: `SubjectTeacherFeedback`, `CadreLogEntry`, `PaymentTransactionRecord` trong `src/types/homeroom.ts`.
- [ ] Bổ sung services trong `src/services/homeroom-service.ts`:
  - `getSubjectTeacherFeed(classId)` & `createSubjectTeacherFeedback(payload)`
  - `getCadreLogs(classId, status?)` & `submitCadreLog(payload)` & `reviewCadreLogs(logIds, action)`
  - `processPaymentWebhook(payload)` (Idempotent auto-reconciliation engine)
- [ ] Giao diện `/homeroom/cooperation`: Feed GVBM tương tác, Acknowledge & 1-Click Convert to Homeroom Event.
- [ ] Giao diện `/homeroom/organization`: Phân công nhiệm vụ BCS, bảng duyệt ghi nhận nề nếp của Tổ trưởng (Batch Approve).
- [ ] Webhook Route `/api/webhook/payment`: Xử lý an toàn, xác thực secret token, chống duplicate idempotency.
- [ ] Kiểm thử 4 tầng: Lint 0 lỗi, Build Exit Code 0, Chạy bộ kiểm thử thực nghiệm `scratch/test-phase2-workflow.mjs`.
- [ ] Gửi Review sang ChatGPT Web qua Bridge 17841 và nhận `🟢 APPROVED`.
