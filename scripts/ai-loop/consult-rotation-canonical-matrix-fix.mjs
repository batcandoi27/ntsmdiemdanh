import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-ROTATION-CANONICAL-TRANSFORM-FIX-009";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (CANONICAL SPRITE ROTATION MATRIX FIX)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR 2D GRAPHICS & MATRIX MATH ARCHITECT
Task ID: ${taskId}
Topic: SỬA LỖI ROTATION OVERFLOW TRÊN SVG FURNITURE (CANONICAL SPRITE TRANSFORM MATRIX)

Kính gửi Senior Architect,

Người dùng chụp ảnh màn hình phản hồi:
"một số vật dụng xoay bị lỗi như hình"

---

## 1. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS):
- Khi xoay vật phẩm 90° (VD: Bàn học kích thước gốc 2x1 -> footprint xoay thành 1x2):
  * \`width\` bị truyền là 60px và \`height\` là 120px.
  * Component vẽ geometry bị phụ thuộc vào dynamic width/height và sau đó lại bị \`rotate(90)\` một lần nữa, dẫn đến hiện tượng sprite bị bóp méo/xoay ngược và tràn ra ngoài khung selection dashed box màu cam.

---

## 2. GIẢI PHÁP CANONICAL SPRITE TRANSFORM:
Áp dụng công thức ma trận chuẩn 2D Game Engine:
\`\`\`xml
<g transform="translate(\${px + footprintWidth/2}, \${py + footprintHeight/2}) rotate(\${rotation}) translate(\${-canonicalWidth/2}, \${-canonicalHeight/2})">
  <!-- Luôn vẽ geometry theo kích thước gốc unrotated canonicalWidth x canonicalHeight -->
</g>
\`\`\`

Kính nhờ Senior Architect xác thực giải pháp và cho phép Antigravity triển khai code và kiểm thử tự động.
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
