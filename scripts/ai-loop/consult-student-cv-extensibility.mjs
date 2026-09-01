import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-STUDENT-CV-EXTENSIBILITY-AND-BATCH-PDF-014";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (DYNAMIC CONFIG, CATALOG CP, TEACHER FIELDS & BATCH CLASS PDF)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR SYSTEM ARCHITECT & PRINT PIPELINE SPECIALIST
Task ID: ` + taskId + `
Topic: NÂNG CẤP MASTER PLAN: XUẤT PDF HÀNG LOẠT TOÀN BỘ LỚP, DYNAMIC SCHOOL CONFIG, CATALOG ADMIN CP & TEACHER CUSTOM FIELDS

Kính gửi Senior Architect,

Người dùng đã bổ sung 4 yêu cầu kỹ thuật rất quan trọng vào Master Plan:

---

## 1. PHÂN TÍCH 4 YÊU CẦU BỔ SUNG:

1. **Hỗ trợ Xuất PDF Hàng Loạt Toàn Bộ Lớp 100% Theo Mẫu Ảnh (Batch Class PDF Export 1:1):**
   - GVCN có nút bấm: "🖨️ Xuất / In Toàn Bộ Sơ Yếu Lý Lịch Cả Lớp (.PDF)".
   - Hệ thống tự động biên dịch toàn bộ học sinh trong lớp (e.g. 43 học sinh) thành một tệp PDF chuẩn duy nhất (hoặc in trực tiếp qua trình duyệt với CSS @media print A4):
     * Mỗi học sinh gồm đúng 2 trang chuẩn theo mẫu ảnh (Trang 1: Bản thân & Gia đình; Trang 2: Người giám hộ, Anh chị em, 16 Checkbox tính cách & 3 Chữ ký).
     * Ngắt trang sạch sẽ (page-break-after: always), chuẩn lề A4 (Lề trái 2.5-3cm để bấm gáy sổ).

2. **Khử Hardcode Tên Trường (Universal Dynamic School Config):**
   - Tuyệt đối KHÔNG hardcode chuỗi "TRƯỜNG THCS TRẦN BỘI CƠ" hay "ỦY BAN NHÂN DÂN QUẬN 5".
   - Tên cơ quan chủ quản, tên trường, niên khóa, tên GVCN được đọc động từ bảng cấu hình app_settings và classes.

3. **Điền Sẵn Tối Đa (Smart Pre-fill) & Danh Mục Chọn Thả Xuống / 1-Touch Chips (Admin CP Configurable Catalogs):**
   - Tự động điền dữ liệu sẵn có từ DB (Họ tên, Ngày sinh, Giới tính, Lớp, SĐT phụ huynh, Dân tộc...).
   - Dropdown & Chips chọn nhanh: Dân tộc, Tôn giáo, Nơi sinh (Bệnh viện), Tỉnh/TP, Nơi KCB ban đầu.
   - Admin CP (/settings) có giao diện cấu hình danh mục chung cho toàn trường.

4. **Khả Năng Mở Rộng Trường Tùy Ý Cho Từng Giáo Viên Chủ Nhiệm (Teacher Extensible Fields):**
   - GVCN có thể thêm các trường tùy chỉnh cho lớp mình (e.g. Phương tiện đi học, Cỡ đồng phục, Zalo, v.v.).
   - Lưu vào profile_data.custom_fields và tự động hiển thị trong Form Phụ huynh và Bảng tổng hợp của GVCN.

---

## 2. YÊU CẦU THIẾT KẾ TỪ CHATGPT WEB:
1. Thiết kế kiến trúc Render Batch PDF / Print CSS (@media print) đảm bảo đúng 2 trang/học sinh không bị tràn dòng.
2. Thiết kế Schema AdminCatalogConfig và TeacherCustomField.
3. Kế hoạch nghiệm thu và kiểm thử Terminal.
`;

  console.log(`[*] Đang gửi yêu cầu tham vấn (${consultPrompt.length} ký tự) sang ChatGPT Web...`);
  const response = await sendToChatGPTWeb(consultPrompt, taskId);

  console.log("\n=================== PHẢN HỒI THIẾT KẾ TỪ CHATGPT WEB ===================");
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
