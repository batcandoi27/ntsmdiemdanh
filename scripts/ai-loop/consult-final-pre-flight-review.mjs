import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

async function main() {
  console.log("======================================================================");
  console.log("  TRIAD-AI FINAL PRE-FLIGHT CONSULTATION: MASTER PLAN V4.4");
  console.log("======================================================================\n");

  const health = await checkBridgeHealth();
  console.log(`[Bridge Status] Health: ${health.ok ? "ONLINE ✅" : "OFFLINE ❌"}`);

  const planPath = "C:\\Users\\BCD\\.gemini\\antigravity-ide\\brain\\efb8e3d5-7d52-4ae0-a3c2-9db7ecd60821\\implementation_plan.md";
  let planContent = "";
  if (fs.existsSync(planPath)) {
    planContent = fs.readFileSync(planPath, "utf-8");
  }

  const prompt = `
BẠN LÀ SENIOR ENTERPRISE ARCHITECT CỦA DỰ ÁN TRƯỜNG HỌC THCS TRẦN BỘI CƠ.
Hội đồng Kiến trúc vừa hoàn tất KẾ HOẠCH MASTER V4.4 (Ready-To-Code) để tích hợp Zalo Bot Gateway (:3871) vào WebApp Điểm Danh & Sổ Chủ Nhiệm (:8888).

NỘI DUNG KẾ HOẠCH MASTER V4.4:
${planContent}

3 CĂN DẶN KỸ THUẬT CUỐI CÙNG ĐÃ TÍCH HỢP:
1. Header Bảo mật \`x-bridge-token\` trong mọi request sang :3871.
2. Hàng đợi Queue Throttling giãn cách 1.5s/tin nhắn để chống Zalo Anti-Flood.
3. Hướng dẫn GVCN phân quyền "Phó Nhóm" (Deputy) cho Bot để tránh mã lỗi Code 166.

YÊU CẦU ĐÁNH GIÁ CUỐI CÙNG TRƯỚC KHI BẮT TAY VÀO CODE GIAI ĐOẠN 1:
1. Rà soát lần cuối: Có còn điểm mù kiến trúc (blindspot), race condition, hay xung đột kỹ thuật nào giữa Next.js App Router và Zalo Gateway Daemon không?
2. Đánh giá tính khả thi và hoàn thiện của 5 Giai đoạn (Phases 1-5), đặc biệt là Giai đoạn 1 (Onboarding One-Touch /ketnoi, Webhook Router, ZaloGatewayClient).
3. Đưa ra Lời Hiệu Triệu & Phê Duyệt Chính Thức (Official Go-Ahead) để đội ngũ Dev App Điểm Danh bắt đầu lập trình Phase 1 ngay lập tức.
`;

  console.log("📤 Đang gửi toàn bộ Master Plan V4.4 sang ChatGPT Web Bridge để thẩm định...");
  const response = await sendToChatGPTWeb(prompt, "TASK-FINAL-PREFLIGHT-V44");
  console.log(`[+] Phản hồi nhận được (${response.length} ký tự).\n`);

  const outputDir = path.join(process.cwd(), ".ai", "consultations");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, "FINAL_PREFLIGHT_V44_APPROVAL.md");
  fs.writeFileSync(outputFile, response, "utf-8");
  console.log(`📄 Đã lưu kết quả thẩm định tại: ${outputFile}`);
}

main().catch(err => {
  console.error("Lỗi thẩm định ChatGPT Web:", err);
  process.exit(1);
});
