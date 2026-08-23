import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = process.argv[2] || "TASK-DOCX-EXPORT-001";
const concept = process.argv[3] || "Chuẩn hóa định dạng xuất file Word (.docx) chuyên nghiệp cho Giáo viên chủ nhiệm";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — TỰ ĐỘNG THAM VẤN CHATGPT WEB (ARCHITECT CONSULT)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const prompt = [
    "# ROLE: INDEPENDENT SENIOR SOFTWARE ARCHITECT",
    `Task ID: ${taskId}`,
    `Topic: ${concept}`,
    "",
    "## YÊU CẦU:",
    "Hãy đánh giá kiến trúc và cung cấp hướng dẫn giải pháp tốt nhất (Best Practices, Anti-patterns cần tránh, Schema chuẩn, và Drop-in Ready code nếu có).",
    "Phản hồi định dạng Markdown chi tiết."
  ].join("\n");

  console.log(`[*] Đang gửi tham vấn sang ChatGPT Web qua Bridge 17841...`);
  const response = await sendToChatGPTWeb(prompt, taskId);

  console.log("\n=================== PHẢN HỒI TỪ CHATGPT WEB ===================");
  console.log(response);

  // Lưu lại vào .ai/consultations/
  const outDir = path.resolve(".ai", "consultations");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${taskId}-CONSULT.md`);
  fs.writeFileSync(outFile, response, "utf-8");
  console.log(`\n[✓] Đã lưu bản tham vấn vào: ${outFile}`);
}

main().catch(err => {
  console.error("Lỗi:", err.message);
  process.exit(1);
});
