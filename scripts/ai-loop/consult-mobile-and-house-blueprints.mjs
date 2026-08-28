import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-MOBILE-HOUSE-DESIGN-004";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (HOUSE BLUEPRINTS, SMART POPOVER & MOBILE UX)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR FULLSTACK & MOBILE UX ARCHITECT
Task ID: ${taskId}
Topic: KHẮC PHỤC CLICK NHÀ RIÊNG, BẢN THIẾT KẾ CĂN CỨ ĐỘC BẢN, SMART POPOVER GẦN CON TRỎ & TỐI ƯU TOÀN DIỆN MOBILE CHO CỔNG HỌC SINH

Kính gửi Senior Architect,

Người dùng gửi phản hồi kèm hình ảnh thực tế và yêu cầu giải quyết 3 vấn đề trọng tâm:

---

## 1. PHÂN TÍCH VẤN ĐỀ & YÊU CẦU CẢI TIẾN:

1. **Khắc Phục Click Nhà Riêng & Bản Thiết Kế Độc Bản Từng Căn Cứ:**
   - Người dùng bấm vào chip "Nhà riêng (Click thăm)" hoặc bấm vào các ô đất viền nhưng chưa mở được hoặc chưa có thiết kế riêng cho từng nhà.
   - Yêu cầu:
     * Nhấp vào chip "Nhà riêng (Click thăm)" -> Bật Modal Danh Sách 28 Căn Hộ Lớp Học để chọn thăm bất kỳ nhà ai.
     * Nhấp trực tiếp vào bất kỳ ô viền 8x8 nào -> Lập tức mở House Tour của ô đó.
     * **Bản thiết kế kiến trúc độc bản:** Mỗi ngôi nhà phải có sơ đồ phòng riêng (Theme: Nhà Gỗ Cozy, Phi Thuyền Không Gian, Lâu Đài Pha Lê, Vườn Cổ Tích...) hiển thị đầy đủ tài sản, đồ nội thất 2D/isometric trực quan đã sở hữu.

2. **Định Vị Bảng Thông Tin (Smart Hover Popover & Mobile Bottom Sheet):**
   - Hiện tại Card thông tin đang đặt cố định \`fixed bottom-6 right-6\`, người dùng yêu cầu:
     * Trên Desktop: Bảng thông tin xuất hiện thông minh bám theo con trỏ chuột (Smart Tooltip Cursor Tracking) hoặc kế bên đối tượng hover, có boundary checking chống tràn mép màn hình.
     * Trên Mobile: Tự động chuyển thành **Bottom Sheet Drawer** trượt mượt từ dưới lên khi chạm (tap) vào bất kỳ con vật/nhà nào.

3. **Tối Ưu Giao Diện Toàn Diện Cho Điện Thoại (Mobile First):**
   - Lưới Metaverse 8x8 co giãn hoàn hảo trên màn hình cảm ứng, kích thước chạm tối thiểu 44px.
   - Thanh Bảng Vàng Top 3 gọn gàng, không bị tràn màn hình.
   - Các form nộp nhiệm vụ, modal cửa hàng, đổi màu trứng hiển thị chuẩn mobile không bị che khuất.

---

## 2. YÊU CẦU THAM VẤN TỪ CHATGPT WEB:
Kính nhờ Senior Architect:
1. **Phân tích nguyên nhân kỹ thuật và giải pháp kiến trúc** cho 3 vấn đề trên.
2. **Xác lập Kế hoạch thực thi (Execution Plan)** tối ưu để Antigravity triển khai code và kiểm thử tự động.
`;

  console.log(`[*] Đang gửi yêu cầu tham vấn (${consultPrompt.length} ký tự) sang ChatGPT Web...`);
  const response = await sendToChatGPTWeb(consultPrompt, taskId);

  console.log("\n=================== PHẢN HỒI THIẾT KẾ TỪ CHATGPT WEB ===================");
  console.log(response);

  const outDir = path.resolve(".ai", "consultations");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${taskId}-BLUEPRINT.md`);
  fs.writeFileSync(outFile, typeof response === "string" ? response : JSON.stringify(response, null, 2), "utf8");
  console.log(`[+] Đã lưu bản thiết kế tại: ${outFile}`);
}

main().catch(err => {
  console.error("[!] Lỗi thực thi:", err);
  process.exit(1);
});
