# TASK-GVCN-001: Tích Hợp Phân Hệ Giáo Viên Chủ Nhiệm (GVCN) Toàn Diện

- **Trạng thái:** `READY`
- **Người thực hiện:** Antigravity (Gemini 3.7 Flash)
- **Reviewer:** ChatGPT Web (OpenAI Independent Senior Architect)
- **Repo:** batcandoi27/ntsmdiemdanh

---

## 1. MỤC TIÊU & BỐI CẢNH (OBJECTIVE)
Mở rộng ứng dụng `ntsmdiemdanh` bằng việc xây dựng phân hệ chuyên biệt dành cho Giáo viên chủ nhiệm (GVCN) tại `/homeroom`, tích hợp dữ liệu điểm danh, lớp học, TKB hiện có vào một chu trình sư phạm khép kín:
**Tổng quan ➔ Hồ sơ học sinh (Timeline) ➔ Ban cán sự & Sơ đồ chỗ ngồi ➔ Sự việc & Can thiệp ➔ Phối hợp Phụ huynh & GVBM ➔ Sổ chủ nhiệm số ➔ Trung tâm In ấn (DOCX/PDF) ➔ Cổng tra cứu Phụ huynh (/portal)**.

---

## 2. IN-SCOPE ACCEPTANCE CRITERIA (TIÊU CHÍ NGHIỆM THU)

### 1. Database & Kiến Trúc
- [ ] Tạo 5 bảng Supabase: `homeroom_class_settings`, `homeroom_events`, `homeroom_interventions`, `homeroom_plans`, `homeroom_parent_contacts`.
- [ ] Không duplicate dữ liệu học sinh, lớp, điểm danh v3; mọi số liệu chuyên cần đều query thời gian thực.
- [ ] Phân quyền chặt chẽ: GVCN chỉ xem/quản lý lớp của mình, Admin/BGH xem toàn trường.

### 2. Giao Diện GVCN (`/homeroom`)
- [ ] Dashboard tổng quan: Sĩ số, vắng, trễ hôm nay; danh sách "Cần xử lý hôm nay", "Tiến bộ đáng ghi nhận", "Kế hoạch tuần".
- [ ] Hồ sơ học sinh & Timeline quá trình giáo dục (sự việc, việc tốt, can thiệp, liên hệ PH).
- [ ] Cơ cấu lớp: Ban cán sự, phân chia 4 tổ, sơ đồ chỗ ngồi kéo thả/gán vị trí.
- [ ] Ghi nhận sự việc & can thiệp tiến bộ (hỗ trợ điểm cộng/trừ linh hoạt).
- [ ] Phối hợp giáo dục: Nhật ký liên hệ PH, tiếp nhận phản hồi GVBM & lời nhắn từ PH.
- [ ] Sổ chủ nhiệm điện tử & Kế hoạch năm (đặc điểm tình hình, mục tiêu, chỉ tiêu, sơ kết).

### 3. Trung Tâm In Ấn & Biểu Mẫu (`/homeroom/print-center`)
- [ ] Tạo 5 bộ biểu mẫu chuẩn THCS (Danh sách & Sơ đồ lớp, Sổ chủ nhiệm, Phiếu liên lạc, Biên bản sự việc, Biên bản họp PH).
- [ ] Hỗ trợ Live Preview, In trực tiếp từ trình duyệt, Xuất PDF và Xuất DOCX (file Word chuẩn form).

### 4. Cổng Tra Cứu Phụ Huynh (`/portal`)
- [ ] Xác thực bảo mật: Chọn Lớp + Nhập CCCD học sinh + Nhập Mã PIN lớp (do GVCN cấp).
- [ ] Xem chuyên cần, nhật ký nề nếp/khen thưởng, TKB, thông báo lớp.
- [ ] Gửi lời nhắn phản hồi đến GVCN.

---

## 3. MUST NOT (ANTI-REGRESSION RULES)
1. Tuyệt đối không làm thay đổi hay phá vỡ luồng điểm danh v3 hiện tại (`/quick-attendance`, `/attendance`).
2. Không can thiệp hoặc ghi đè bảng dữ liệu `attendance_records_v3` bằng cơ chế riêng.
3. Không làm hỏng các báo cáo hiện có trong `/reports` và `/admin/dashboard`.
