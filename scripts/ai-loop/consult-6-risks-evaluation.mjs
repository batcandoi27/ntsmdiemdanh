import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-EVALUATE-6-TECHNICAL-RISKS-015";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (ĐÁNH GIÁ 6 RỦI RO KỸ THUẬT TỪ PEER REVIEW)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR SYSTEM ARCHITECT & APPSEC LEAD
Task ID: ` + taskId + `
Topic: PHẢN BIỆN & ĐÁNH GIÁ 6 RỦI RO KỸ THUẬT TIỀM ẨN TRONG HỆ THỐNG SƠ YẾU LÝ LỊCH VÀ XUẤT BATCH PDF

Kính gửi Senior Architect ChatGPT Web,

Một chuyên gia đánh giá độc lập (Peer Reviewer) vừa đưa ra 6 nhận xét/rủi ro kỹ thuật đối với hệ thống Sơ Yếu Lý Lịch & Xuất Batch PDF:

1. **Rủi ro vỡ layout PDF (N x 2 trang) làm lệch in 2 mặt (Duplex Printing):** Do văn bản tự do quá dài đẩy tràn trang 3. Đề xuất: maxLength (UI + Zod), CSS container clamp/dynamic font scale, pre-flight check cảnh báo trước khi in.
2. **Race condition ghi đè JSONB:** Khi phụ huynh sửa và GVCN duyệt cùng lúc. Đề xuất: Tách riêng các trường tác nghiệp (teacher_notes, status, is_locked) ra khỏi profile_data, dùng Optimistic Locking (version/updated_at) và toán tử JSONB merge.
3. **Vòng đời dữ liệu của Trường tùy chỉnh GVCN:** Khi GVCN sửa/xóa định nghĩa trường hoặc HS chuyển lớp. Đề xuất: Soft delete (is_active=false) và lưu Snapshot { field_key, field_label, value } vào profile_data tại thời điểm submit.
4. **Tràn bộ nhớ / Timeout khi xuất Batch PDF trên Serverless:** Headless browser 86 trang dễ OOM/timeout. Đề xuất: Khuyên dùng Client-side HTML Print (@media print + window.print()) tức thì 0 RAM server, hoặc Async Queue chunking nếu server-side.
5. **Ràng buộc chuẩn hóa dữ liệu hành chính & CCCD/BHYT:** BHYT (/^[A-Z]{2}[0-9]{13}$/), CCCD (/^[0-9]{12}$/), cấu trúc địa chỉ phân cấp (province_code, district_code, ward_code, street_address).
6. **Bảo mật phân quyền Multi-tenant & Fallback tên trường:** Thêm school_id / index, RBAC strict theo lớp chủ nhiệm, chặn in khi chưa cấu hình trường thay vì silently fallback.

---

## YÊU CẦU:
1. Đánh giá tính chuẩn xác của 6 nhận xét trên (Đúng / Sai / Cần điều chỉnh ở điểm nào?).
2. Hướng dẫn tích hợp ngay 6 giải pháp phòng ngừa này vào Master Implementation Plan để đưa vào thực thi.
`;

  console.log(`[*] Đang gửi 6 rủi ro (${consultPrompt.length} ký tự) sang ChatGPT Web...`);
  const response = await sendToChatGPTWeb(consultPrompt, taskId);

  console.log("\n=================== ĐÁNH GIÁ TỪ CHATGPT WEB ===================");
  console.log(response);

  const outDir = path.resolve(".ai", "consultations");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${taskId}-EVALUATION.md`);
  fs.writeFileSync(outFile, typeof response === "string" ? response : JSON.stringify(response, null, 2), "utf8");
  console.log(`[+] Đã lưu bản đánh giá tại: ${outFile}`);
}

main().catch(err => {
  console.error("[!] Lỗi thực thi:", err);
  process.exit(1);
});
