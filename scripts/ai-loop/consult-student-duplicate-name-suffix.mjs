import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-STUDENT-DUPLICATE-NAME-SUFFIX-ORCHESTRATION";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (GIẢI PHÁP HẬU TỐ HỌC SINH TRÙNG TÊN)");
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
Topic: THIẾT KẾ KIẾN TRÚC PHÂN BIỆT TRÙNG TÊN HỌC SINH TRONG CÙNG LỚP VỚI HẬU TỐ (A), (B), (C) BẢO TOÀN TÍNH CỐ ĐỊNH KHI CHUYỂN LỚP

Kính gửi Senior Architect,

Hệ thống quản lý điểm danh và nề nếp học sinh (THCS Trần Bội Cơ) hiện gặp bài toán thực tế sư phạm:
Trong cùng 1 lớp có học sinh TRÙNG CẢ HỌ VÀ TÊN.
Ví dụ tại lớp 9A8 (năm học 2026-2027) có 2 cặp học sinh trùng tên thật trong DB:
1. "Lý Gia Hỷ" (2 em):
   - Em 1: sinh 27/05/2012, Mã: 79774504-00-4250, STT 1724
   - Em 2: sinh 14/10/2012, Mã: 79774504-00-4251, STT 1723
2. "Tăng Bảo Nghi" (2 em):
   - Em 1: sinh 14/03/2012, Mã: 79774504-00-4259, STT 1733
   - Em 2: sinh 27/11/2012, Mã: 79774504-00-4260, STT 1734

---

## YÊU CẦU NGHIỆP VỤ CỐT LÕI TỪ NGƯỜI DÙNG:
1. Tất cả mọi nơi thể hiện thông tin học sinh (Danh sách điểm danh hằng ngày, Điểm danh nhanh, Báo cáo thống kê, Xuất file Excel, Sổ theo dõi & thu phí, Cổng phụ huynh /portal, Danh sách học sinh) PHẢI TỰ ĐỘNG THÊM HẬU TỐ PHÂN BIỆT:
   Ví dụ: "Lý Gia Hỷ (A)", "Lý Gia Hỷ (B)"...
2. **BẤT BIẾN CỐ ĐỊNH (INVARIANT):** 
   Hậu tố (A), (B) này phải BẢO TOÀN CỐ ĐỊNH trong cùng lớp. Sau này nếu có học sinh mới chuyển lớp vào lớp này mà lại trùng tên "Lý Gia Hỷ", học sinh mới phải nhận hậu tố kế tiếp là "(C)" và TUYỆT ĐỐI KHÔNG ĐƯỢC làm xáo trộn hay thay đổi hậu tố (A), (B) của 2 học sinh cũ!

---

## 3 PHƯƠNG ÁN KIẾN TRÚC ĐANG CÂN NHẮC:

### Phương án 1: Cập nhật trực tiếp vào cột \`full_name\` của bảng \`students\` trong Database
- Đổi trực tiếp giá trị chuỗi thành: "Lý Gia Hỷ (A)" và "Lý Gia Hỷ (B)".
- Ưu điểm: Đơn giản nhất, không cần sửa bất kỳ file mã nguồn TypeScript hay hàm render/export nào, hoạt động ngay lập tức ở 100% màn hình và báo cáo.
- Nhược điểm/Rủi ro:
  + Khi học sinh chuyển sang lớp khác mà lớp đó không có ai trùng tên, học sinh vẫn mang hậu tố (A) trong tên.
  + Tên khai sinh hành chính chính thức (VNeID/bằng tốt nghiệp) bị biến đổi.

### Phương án 2: Thêm cột \`name_suffix\` vào bảng quan hệ \`student_classes\` + Cập nhật View \`v_student_list\`
- Trong bảng \`student_classes\` (hoặc bảng \`students\`), thêm cột \`name_suffix VARCHAR(10) NULL\` (lưu 'A', 'B', 'C'...).
- Cập nhật View \`v_student_list\` (hoặc hàm chuyển đổi):
  \`full_name = CASE WHEN sc.name_suffix IS NOT NULL THEN s.full_name || ' (' || sc.name_suffix || ')' ELSE s.full_name END\`
- Ưu điểm:
  + Hậu tố gắn liền với lớp học cụ thể (\`student_classes\`). Nếu chuyển sang lớp khác, bản ghi lớp mới không có suffix nếu không trùng tên.
  + Tên khai sinh trong bảng \`students\` được bảo toàn 100% nguyên vẹn.
  + Mọi module giao diện (Next.js/React) vẫn đọc từ \`v_student_list\` hoặc \`Student.fullName\` nên 100% tương thích ngược, không cần sửa code UI/Export.
  + Khi có học sinh mới chuyển vào lớp: chỉ cần một Trigger hoặc logic RPC kiểm tra trong lớp xem có ai trùng tên không; nếu có hậu tố ['A', 'B'] thì tự động gán 'C' cho học sinh mới vào \`student_classes.name_suffix\`. Cố định vĩnh viễn!

### Phương án 3: Tính toán hoàn toàn bằng mã TypeScript tại tầng Model/Gateway (\`supabase-adapter.ts\`)
- Không sửa Database Schema. Tại hàm \`getStudentsByClass\`, nhóm các học sinh trùng tên theo \`full_name\` và gắn hậu tố.
- Nhược điểm lớn: Nếu một học sinh mới chuyển vào lớp mà có ngày sinh nhỏ hơn học sinh (B), sắp xếp động sẽ đẩy học sinh cũ từ (B) thành (C) hoặc (A) thành (B), vi phạm trực tiếp yêu cầu cố định của người dùng! Trừ khi phải lưu trữ lịch sử hoặc quy tắc phức tạp.

---

## CÂU HỎI THAM VẤN DÀNH CHO SENIOR ARCHITECT:
1. Đánh giá chuyên sâu ưu/nhược điểm và rủi ro của 3 phương án trên. Phương án nào tối ưu nhất cho bài toán này của hệ thống trường THCS?
2. Trong văn hóa quản lý trường học tại Việt Nam (sổ điểm, sổ học bạ, CSDL ngành, danh sách lớp), quy chuẩn nào là tối ưu và thực dụng nhất?
3. Thiết kế chi tiết cơ chế cấp phát hậu tố (A, B, C...) đảm bảo tính cố định tuyệt đối (Idempotency & Monotonic Assignment) khi có học sinh chuyển lớp.
4. Lập lộ trình triển khai (Step-by-step Execution Plan) đảm bảo 0 regression cho logic cũ.
`;

  console.log("[*] Dispatching consultation prompt to ChatGPT Web Luna via Bridge 17841...");
  const startTs = Date.now();
  const responseText = await sendToChatGPTWeb(consultPrompt, taskId);
  const durationSec = ((Date.now() - startTs) / 1000).toFixed(1);
  console.log(`[+] ChatGPT Web response received in ${durationSec}s!`);

  // Save consultation artifact with timestamp naming convention
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, "").slice(0, 15).replace("T", "_");
  const consultDir = path.join(process.cwd(), ".ai", "consultations");
  if (!fs.existsSync(consultDir)) {
    fs.mkdirSync(consultDir, { recursive: true });
  }

  const filename = `${timestamp}_CONSULT_${taskId}_NAME_SUFFIX_BLUEPRINT.md`;
  const filePath = path.join(consultDir, filename);

  const fileContent = `---
task_id: ${taskId}
timestamp: ${now.toISOString()}
duration_seconds: ${durationSec}
bridge_endpoint: http://127.0.0.1:17841/v1/responses
model: chatgpt-web/luna
status: CONSULTATION_COMPLETED
---

# THAM VẤN KIẾN TRÚC: HẬU TỐ PHÂN BIỆT HỌC SINH TRÙNG TÊN CÙNG LỚP (A, B, C)
*Tư vấn độc lập từ ChatGPT Web (Senior Architect & Educational Data Specialist)*

${responseText}
`;

  fs.writeFileSync(filePath, fileContent, "utf8");
  console.log(`[+] Đã lưu bản tham vấn kiến trúc vật lý tại: ${filePath}`);
}

main().catch(err => {
  console.error("[!] Error running consultation:", err);
  process.exit(1);
});
