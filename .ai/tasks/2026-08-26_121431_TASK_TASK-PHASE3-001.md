# TASK CONTRACT: PHASE 3 — INTELLIGENCE & PRINT CENTER
**Task ID:** `TASK-PHASE3-MASTER-001`
**Module:** Phân hệ Giáo Viên Chủ Nhiệm (Homeroom Module)
**Phase:** 3 / 3 (Phase cuối cùng trong Kế hoạch cải tiến toàn diện)
**Date:** 2026-08-23
**Implementer:** Antigravity (Gemini)
**Reviewer & Gatekeeper:** ChatGPT Web (Senior Software Architect)

---

## 1. MỤC TIÊU & PHẠM VI (GOAL & SCOPE)
1. **Trợ Lý Thông Minh & Smart Synthesis Report (`/homeroom/handbook`):**
   - Phân tích tự động 4 nhóm học sinh trong tháng (Xuất sắc / Chuyên cần / Cần can thiệp / Ổn định).
   - Ma trận Đề xuất Can thiệp Cá nhân hóa (Personalized Intervention Matrix) theo Thông tư 22/27.
   - Trình gợi ý nhận xét sổ liên lạc / học bạ tự động chuẩn sư phạm theo mức xếp loại.
2. **Trung Tâm In Ấn & Xuất Bản Đa Mẫu Chuẩn Bộ GD&ĐT (`/homeroom/print-center`):**
   - Bổ sung Mẫu 6: Bảng Tổng hợp Thi đua Nề nếp & Chuyên cần Tháng (`template_competition_summary`).
   - Bổ sung Mẫu 7: Báo cáo Tổng kết Đánh giá Tháng (`template_monthly_synthesis`).
   - Hỗ trợ Xuất Hàng Loạt Phiếu Liên Lạc Toàn Bộ Học Sinh Lớp trong 1 Click.

---

## 2. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [ ] `AC-1`: `getHomeroomMonthlySynthesis` phân loại chuẩn xác 4 nhóm học sinh dựa trên tổng hợp chuyên cần, sự kiện nề nếp và điểm thi đua.
- [ ] `AC-2`: Trình gợi ý nhận xét học bạ theo Thông tư 22/27 hoạt động mượt mà, phân loại rõ Tốt/Khá/Đạt/Chưa đạt và cho phép copy/áp dụng 1-chạm.
- [ ] `AC-3`: Backend `/api/homeroom/export-docx` hỗ trợ đầy đủ 7 mẫu văn bản chuẩn in ấn Bộ GD&ĐT.
- [ ] `AC-4`: Bộ test thực nghiệm `scratch/test-phase3-workflow.mjs` & `scratch/test-phase3-adversarial.mjs` chạy 100% PASS.
- [ ] `AC-5`: `npm run lint` 0 lỗi, `npm run build` Exit Code 0 (34/34 routes).
- [ ] `AC-6`: Nhận phê duyệt chính thức `🟢 APPROVED` từ ChatGPT Web Senior Architect qua Loopback Bridge 17841.
