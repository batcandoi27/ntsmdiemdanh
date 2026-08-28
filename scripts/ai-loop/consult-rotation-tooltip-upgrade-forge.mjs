import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-FURNITURE-ROTATION-UPGRADE-FORGE-008";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (ROTATION, HOVER TOOLTIP & 5-TIER UPGRADE FORGE)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR 2D GAME ENGINE & PROGRESSION SYSTEM ARCHITECT
Task ID: ${taskId}
Topic: HỆ THỐNG XOAY NỘI THẤT (0-90-180-270°), SMART HOVER TOOLTIP & PHÒNG NÂNG CẤP ĐỒ 5 CẤP ĐỘ BẰNG XP/XU (5 TIER SVG EVOLUTION)

Kính gửi Senior Architect,

Người dùng yêu cầu 3 tính năng nâng cấp lớn cho Căn cứ & Nội Thất:

---

## 1. PHÂN TÍCH YÊU CẦU:

1. **Cho Phép Đồ Vật Xoay Được (Rotation Engine):**
   - Hỗ trợ xoay 4 hướng: 0°, 90°, 180°, 270°.
   - Đảo chiều kích thước \`width <-> height\` khi xoay 90°/270°, tự động kiểm tra biên tường 8x8.
   - Nút xoay 🔄 trong thanh công cụ và phím tắt R.

2. **Hover Tooltip Thông Tin Chi Tiết Từng Món Đồ:**
   - Rê chuột vào món đồ trên mặt bằng: Hiện Card Tooltip gồm Tên, Cấp sao (Cấp 1..5 ⭐), Hướng xoay, Tọa độ và chỉ số buff thưởng.

3. **Phòng Nâng Cấp Nội Thất (Item Upgrade Workshop / Forge ⚒️):**
   - Cho phép học sinh tiêu thụ Điểm Kinh Nghiệm (XP) để nâng cấp từng món đồ từ **Cấp 1 đến Cấp 5**:
     * Cấp 1 (Cơ Bản ⭐): Hình thái chuẩn.
     * Cấp 2 (Tinh Xảo ⭐⭐): Thêm viền kim loại & chi tiết bóng đổ.
     * Cấp 3 (Cao Cấp ⭐⭐⭐): Thêm hoa văn vàng kim & đèn phụ kiện.
     * Cấp 4 (Huyền Thoại ⭐⭐⭐⭐): Thêm hiệu ứng phát quang (Glow Aura).
     * Cấp 5 (Thần Thoại ⭐⭐⭐⭐⭐): Hiệu ứng hạt bụi sao lấp lánh (Star Particles) & buff chỉ số tối đa.
   - Mỗi cấp độ hiển thị sự thay đổi trực quan rõ nét trên SVG.

---

## 2. YÊU CẦU THAM VẤN TỪ CHATGPT WEB:
1. Thiết kế kiến trúc Data Model cho Rotation, Tooltip & Tier Evolution.
2. Xác lập Execution Plan tối ưu để Antigravity triển khai code và kiểm thử tự động.
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
