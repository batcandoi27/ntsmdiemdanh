import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-STUDENT-CURRICULUM-VITAE-MASTER-PLAN-013";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (MASTER PLAN SƠ YẾU LÝ LỊCH HỌC SINH)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR SYSTEM ARCHITECT & EDUCATIONAL DATA SPECIALIST
Task ID: ${taskId}
Topic: MASTER PLAN HỆ THỐNG SƠ YẾU LÝ LỊCH HỌC SINH TOÀN DIỆN (100% THEO BIỂU MẪU THỰC TẾ TRƯỜNG THCS TRẦN BỘI CƠ)

Kính gửi Senior Architect,

Người dùng yêu cầu nâng cấp mục "Danh Sách & Hồ Sơ Giáo Dục Học Sinh" với biểu mẫu Sơ Yếu Lý Lịch Học Sinh thực tế gồm 2 trang chi tiết (đính kèm ảnh chụp biểu mẫu chính thức năm học 2026-2027).

---

## 1. PHÂN TÍCH ĐỐI CHIẾU 100% CÁC TRƯỜNG THÔNG TIN BIỂU MẪU MẪU ẢNH:

### PHẦN I. THÔNG TIN BẢN THÂN HỌC SINH (Khai khớp với giấy khai sinh và CCCD)
1. **Họ tên HS (IN HOA)** + **Giới tính (Nam/Nữ)**
2. **Ngày sinh (ngày/tháng/năm)** + **Là con thứ mấy trong gia đình**
3. **Dân tộc** + **Quốc tịch** + **Tôn giáo**
4. **Số CCCD** + **Ngày cấp** + **Nơi cấp** + **Mã định danh cá nhân (nếu chưa có CCCD)**
5. **Nơi sinh chi tiết** (Tên bệnh viện, trạm y tế; Xã/Phường; Tỉnh/TP)
6. **Nơi đăng ký khai sinh** (Xã/Phường; Tỉnh/TP)
7. **Quê quán chi tiết** (Tổ/Thôn/Xóm/Khu phố; Xã/Phường; Tỉnh/TP)
8. **Nơi thường trú** (Số nhà + đường; Khu phố; Xã/Phường; Tỉnh/TP)
9. **Chỗ ở hiện nay** (Số nhà + đường; Khu phố; Xã/Phường; Tỉnh/TP)
10. **Học sinh thuộc diện chính sách (Checkboxes):**
    - [ ] Con thương binh (Loại: ...)
    - [ ] Hộ nghèo / cận nghèo (Mã số: ...)
    - [ ] Con liệt sĩ
    - [ ] Con mồ côi cả cha lẫn mẹ
    - [ ] Khác (Ghi rõ: ...)
11. **Hiện đang ở với ai**
12. **Người trực tiếp quản lý HS** (Họ tên; Mối quan hệ; Số điện thoại liên lạc)
13. **Sở thích, năng khiếu**
14. **Vấn đề sức khỏe cần lưu ý** (Bệnh mãn tính, thị lực, tim mạch, dị ứng, v.v.)
15. **Chức vụ trong lớp hoặc trong chi đội** (Lớp trưởng, Lớp phó, Tổ trưởng, Đội viên...)
16. **Mã số Bảo hiểm Y tế (BHYT)** + **Nơi đăng ký khám chữa bệnh ban đầu**

### PHẦN II. THÔNG TIN GIA ĐÌNH
1. **Thông tin Cha:** Họ tên (theo khai sinh), Năm sinh, Số CCCD, Các số ĐT liên lạc, Nghề nghiệp, Chức vụ, Nơi làm việc.
2. **Thông tin Mẹ:** Họ tên (theo khai sinh), Năm sinh, Số CCCD, Các số ĐT liên lạc, Nghề nghiệp, Chức vụ, Nơi làm việc.
3. **Thông tin Người giám hộ (nếu có):** Họ tên, Năm sinh, Số CCCD, Các số ĐT liên lạc, Nghề nghiệp, Chức vụ, Nơi làm việc.
4. **Danh sách anh, chị, em ruột (1..5):** Họ và tên, Năm sinh, Nghề nghiệp / Trường lớp đang học.

### PHẦN III. THAM KHẢO Ý KIẾN PHỤ HUYNH HỌC SINH
1. **16 Checkboxes Khảo sát Tính cách của HS:**
   - [ ] Kiên nhẫn, chịu khó
   - [ ] Lễ phép, chừng mực
   - [ ] Hướng nội
   - [ ] Cạnh tranh, cầu toàn
   - [ ] Hòa đồng, cởi mở
   - [ ] Quan tâm đến người khác
   - [ ] Sáng tạo, mơ mộng
   - [ ] Nổi loạn, chống đối
   - [ ] Nóng tính
   - [ ] Trung thực
   - [ ] Thụ động, thờ ơ
   - [ ] Lãnh đạo, có ảnh hưởng
   - [ ] Nhạy cảm, Rụt rè
   - [ ] Hướng ngoại
   - [ ] Vô tư, hài hước
   - [ ] Khác (Nhập thêm)
2. **Hoàn cảnh đặc biệt của gia đình có thể ảnh hưởng đến việc học tập của HS**
3. **Thông tin xác nhận liên lạc & chữ ký:** Người liên lạc chính khi cần (Cha / Mẹ / Giám hộ) + Chữ ký số / Họ tên người khai.

---

## 2. KIẾN TRÚC HỆ THỐNG ĐỀ XUẤT (3 TRỤ CỘT):

### Trụ cột 1: Schema Database (Bảo toàn 100% logic điểm danh cũ)
- Tạo bảng mới: \`student_curriculum_vitae\` (hoặc \`student_dossiers\`):
  * \`id\` UUID PRIMARY KEY
  * \`student_id\` UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE
  * \`class_id\` VARCHAR NOT NULL
  * \`academic_year\` VARCHAR DEFAULT '2026-2027'
  * \`profile_data\` JSONB NOT NULL (chứa toàn bộ cấu trúc đầy đủ 3 phần trên)
  * \`parent_submitted_at\` TIMESTAMPTZ
  * \`teacher_verified_at\` TIMESTAMPTZ
  * \`is_locked\` BOOLEAN DEFAULT false
  * \`created_at\`, \`updated_at\` TIMESTAMPTZ
- Không sửa schema \`students\` table để các truy vấn điểm danh, báo cáo, webhook giữ nguyên tốc độ siêu nhanh (Zero-Regression Invariant).

### Trụ cột 2: Cổng Phụ Huynh Điền & Cập Nhật Trực Tuyến (\`/portal\`)
- Tab **"📝 Sơ Yếu Lý Lịch"** trong Cổng Phụ Huynh:
  * Tối ưu Responsive (Mobile & Desktop).
  * Auto-save nháp + Nút "Gửi Hồ Sơ Chính Thức Đến GVCN".
  * Giao diện điền nhanh: Lưới Checkbox tính cách 1 chạm, tự động điền các trường có sẵn từ hệ thống điểm danh (Họ tên, Ngày sinh, Giới tính...).

### Trụ cột 3: GVCN Quản Lý, Thống Kê & Xuất Biểu Mẫu In Ấn (\`/homeroom/students\`, \`/homeroom/print-center\`, \`/api/homeroom/export-docx\`)
- **Drawer / Modal Sơ Yếu Lý Lịch trong Sổ Chủ Nhiệm:** GVCN xem, duyệt, chỉnh sửa nhanh.
- **Xuất DOCX / In PDF Chuẩn 100% Mẫu THCS Trần Bội Cơ:**
  * **Mẫu A:** Bản in Phiếu Sơ Yếu Lý Lịch Học Sinh (1 trang đôi hoặc 2 trang chuẩn theo đúng format ảnh giấy).
  * **Mẫu B:** Bảng Thống Kê Tổng Hợp Toàn Lớp (Custom chọn cột in: BHYT, CCCD, SĐT Cha Mẹ, Tình trạng sức khỏe, Hoàn cảnh đặc biệt).

---

## 3. YÊU CẦU ĐÁNH GIÁ TỪ SENIOR ARCHITECT:
1. Đánh giá tính đầy đủ của cấu trúc JSON Schema \`StudentCurriculumVitae\`.
2. Kiểm tra tính an toàn kiến trúc (đảm bảo không ảnh hưởng module điểm danh).
3. Đề xuất các phase triển khai tuần tự theo Dev Loop.
`;

  console.log(`[*] Đang gửi yêu cầu tham vấn (${consultPrompt.length} ký tự) sang ChatGPT Web...`);
  const response = await sendToChatGPTWeb(consultPrompt, taskId);

  console.log("\n=================== MASTER PLAN TỪ CHATGPT WEB ===================");
  console.log(response);

  const outDir = path.resolve(".ai", "consultations");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${taskId}-MASTER-BLUEPRINT.md`);
  fs.writeFileSync(outFile, typeof response === "string" ? response : JSON.stringify(response, null, 2), "utf8");
  console.log(`[+] Đã lưu bản thiết kế tại: ${outFile}`);
}

main().catch(err => {
  console.error("[!] Lỗi thực thi:", err);
  process.exit(1);
});
