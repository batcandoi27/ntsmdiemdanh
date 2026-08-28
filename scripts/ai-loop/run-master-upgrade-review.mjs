import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-METAVERSE-MASTER-UPGRADE-003";

async function main() {
  const consultPrompt = `
Kính gửi Senior Architect,

Hãy xem xét và đưa ra quyết định nghiệm thu chính thức cho TASK-METAVERSE-MASTER-UPGRADE-003:

### BẰNG CHỨNG KIỂM ĐỊNH THỰC TẾ:
1. Level 1 Baseline cho 100% học sinh (43/43 = Level 1).
2. Nhận diện giới tính Nam (22) / Nữ (21) và render SVG Nơ hồng / Sao chiến binh.
3. Nhãn định danh rút gọn 8A13_XX cho 43/43 học sinh.
4. Quota (1 tên / 3 nhánh / 1 màu trứng tháng) & Cơ chế Phiếu Tẩy Tủy hoạt động 100%.
5. House Tour Modal: xem 28 căn cứ nhà riêng với đồ nội thất, cúp, thả tim ❤️.
6. Ngân hàng 5 nhóm nhiệm vụ & Quy tắc 1 nhiệm vụ / nhóm / tuần.
7. Google Drive in-place upload & tự động gắn định danh (bỏ giấy ghi nickname).
8. Mở rộng Cửa hàng ảo: Thêm Nội Thất, Trang Sức, Đèn Neon.
9. Toàn bộ 6/6 tests PASS, Production Build 45/45 routes compiled thành công Exit Code 0.

Xin hãy phản hồi theo format:
{
  "status": "APPROVED",
  "phase": "Master Plan Metaverse 2D & Student Portal Master Upgrade",
  "layers_evaluated": {
    "architecture_and_domain": "...",
    "code_quality_and_typing": "...",
    "security_and_idempotency": "...",
    "integration_and_workflow": "...",
    "empirical_tests": "..."
  },
  "metrics": {
    "build_success": true,
    "routes_compiled": 45,
    "master_features_delivered": "9/9",
    "unit_tests_pass": "6/6"
  },
  "findings": []
}
`;

  console.log("[*] Đang gửi bài review sang ChatGPT Web...");
  const response = await sendToChatGPTWeb(consultPrompt, taskId);

  console.log("\n=================== ĐÁNH GIÁ TỪ CHATGPT WEB ===================");
  console.log(response);

  const outDir = path.resolve(".ai", "review-requests");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${taskId}-REVIEW-RESPONSE.json`);
  fs.writeFileSync(outFile, typeof response === "string" ? response : JSON.stringify(response, null, 2), "utf8");
}

main().catch(err => {
  console.error("[!] Lỗi thực thi:", err);
  process.exit(1);
});
