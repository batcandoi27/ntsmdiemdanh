import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

async function main() {
  console.log("======================================================================");
  console.log("  TRIAD-AI CONSULTATION: ZALO BOT GATEWAY MASTER INTEGRATION PLAN");
  console.log("======================================================================\n");

  const health = await checkBridgeHealth();
  console.log(`[Bridge Status] Health: ${health.ok ? "ONLINE ✅" : "OFFLINE ❌"}`);

  const specPath = "C:\\AI APP\\app-zalobot\\docs\\ZALO_BOT_INTEGRATION_SPEC.md";
  let specContent = "";
  if (fs.existsSync(specPath)) {
    specContent = fs.readFileSync(specPath, "utf-8");
  }

  const prompt = `
BẠN LÀ SENIOR ENTERPRISE ARCHITECT CỦA DỰ ÁN TRƯỜNG HỌC THCS TRẦN BỘI CƠ.
Nhiệm vụ: Phân tích toàn diện và lập KẾ HOẠCH MASTER (PLAN A vs PLAN B) để tích hợp Hệ thống Zalo Bot Gateway (app-zalobot) vào WebApp Điểm Danh & Sổ Chủ Nhiệm (app-diemdanh).

### TÀI NGUYÊN ĐÃ CÓ:
1. WebApp Điểm Danh (app-diemdanh):
   - Techstack: Next.js (App Router), TypeScript, Supabase PostgreSQL Adapter, TailwindCSS, Server Actions.
   - Các Module cốt lõi:
     + Module 1: Điểm danh nhanh, sổ điểm danh v3, điểm danh bộ môn.
     + Module 2: Báo cáo chuyên cần, nề nếp tuần/tháng, thống kê vắng/trễ/vi phạm, modal soạn tin nhắn Zalo.
     + Module 3: Sổ chủ nhiệm, quản lý học sinh, sơ yếu lý lịch (SYLL), cơ cấu tổ chức, biên bản họp.
     + Module 4: Cổng phụ huynh (Portal), thanh toán học phí VietQR, nộp đơn xin nghỉ phép.
     + Module 5: Cổng học sinh (Metaverse 2.5D/3D), nhiệm vụ học tập, bảng xếp hạng.
     + Module 6: Quản trị BGH & Cài đặt hệ thống (Feature Flags, API Keys, RBAC).

2. Đặc tả Zalo Bot Gateway (app-zalobot / ZALO_BOT_INTEGRATION_SPEC.md):
   - Gateway độc lập Node.js/TypeScript chạy tại port 3871.
   - Kiến trúc 2 tầng: Zero-AI (Deterministic, 0ms, 0đ) vs AI-Powered (LLM Hermes/Gemini/OpenAI).
   - Năng lực: Gửi tin nhắn 1-1, tin nhắn nhóm, sinh VietQR động, xuất Word .docx, xuất Excel .xlsx, tạo Poll nhóm, thả reaction, bóc tách file đơn xin phép PDF/Docx, tạo ảnh khen thưởng AI, viết nhận xét học sinh AI.

### YÊU CẦU ĐÁNH GIÁ & LẬP MASTER PLAN:
1. Rà soát toàn bộ Use Cases giao thoa giữa app-diemdanh và app-zalobot.
2. Xây dựng Kế hoạch Master A (Microservice Gateway Architecture via HTTP/Webhook - Khuyến nghị) vs Kế hoạch Master B (Monorepo In-Process Embedding).
3. Đưa ra ma trận so sánh chi tiết giữa Plan A và Plan B (Ưu/Nhược điểm, Độ phức tạp, Độ tin cậy, Khả năng mở rộng, Rủi ro Zalo Session drop).
4. Xác lập 5 Invariants (Nguyên tắc bất biến bảo vệ hệ thống) và Lộ trình triển khai 4 Giai đoạn (Phases 1-4) có bài test kiểm định thực nghiệm.

Hãy trả về bản phân tích kiến trúc Master Plan chuyên nghiệp, sâu sắc, có cấu trúc markdown rõ ràng.
`;

  console.log("📤 Đang gửi yêu cầu tham vấn tới ChatGPT Web Bridge...");
  const response = await sendToChatGPTWeb(prompt, "TASK-ZALO-BOT-MASTER-PLAN");
  console.log(`[+] Phản hồi nhận được (${response.length} ký tự).\n`);

  const outputDir = path.join(process.cwd(), ".ai", "consultations");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, "ZALO_BOT_MASTER_PLAN_CONSULTATION.md");
  fs.writeFileSync(outputFile, response, "utf-8");
  console.log(`📄 Đã lưu kết quả tham vấn tại: ${outputFile}`);
}

main().catch(err => {
  console.error("Lỗi tham vấn ChatGPT Web:", err);
  process.exit(1);
});
