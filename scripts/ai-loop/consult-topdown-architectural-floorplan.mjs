import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-ARCHITECTURAL-FLOORPLAN-EDITOR-006";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (TOP-DOWN ARCHITECTURAL FLOOR PLAN & ROOM EDITOR)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR FULLSTACK & INTERACTIVE 2D CANVAS ARCHITECT
Task ID: ${taskId}
Topic: BẢN VẼ PHỐI CẢNH MẶT BẰNG KIẾN TRÚC NHÌN TỪ TRÊN XUỐNG (TOP-DOWN ARCHITECTURAL FLOOR PLAN) & BỘ BIÊN TẬP NỘI THẤT (MUA, THÊM BỚT, DI CHUYỂN VỊ TRÍ, CHỈNH MÀU SẮC TỪNG VẬT PHẨM)

Kính gửi Senior Architect,

Người dùng yêu cầu nâng cấp toàn diện hệ thống Nhà Riêng & Cửa Hàng:
1. **Sửa lỗi Mua Vật Phẩm (Working Shop & Inventory):**
   - Nhấn Mua -> Trừ Xu thực tế, lưu vật phẩm vào Kho Đồ (Inventory) của học sinh, thông báo thành công rõ ràng.
2. **Bản Vẽ Mặt Bằng Kiến Trúc Nhìn Từ Trên Xuống (Top-Down Architectural Floor Plan):**
   - Dạng bản vẽ kỹ thuật kiến trúc nội thất nhìn từ trên xuống (Top-Down Floor Layout) với lưới 6x6 hoặc 8x8, tường bao, cửa ra vào, phân vùng phòng rõ ràng, thẩm mỹ đồ họa blueprint kiến trúc hiện đại.
3. **Thao Tác Thêm / Bớt / Di Chuyển / Đổi Màu Từng Vật Phẩm (Full Interactive Interior Designer):**
   - **Thêm (Place):** Chọn vật phẩm từ Kho đồ -> Đặt vào ô mong muốn trên mặt bằng.
   - **Bớt (Remove):** Nhấp vào đồ đang đặt -> Gỡ về kho.
   - **Di chuyển (Move):** Nhấp chọn đồ -> Nhấp ô mới để dịch chuyển tọa độ (x, y).
   - **Đổi màu (Color Setting per item):** Hỗ trợ đổi màu sắc tùy biến cho từng vật phẩm (màu đệm, màu gỗ, màu đèn, màu thảm...).
   - **Lưu cấu hình (Save Layout):** Tự động lưu cấu hình mặt bằng của học sinh để hiển thị cho bạn bè khi ghé thăm.

Kính nhờ Senior Architect:
1. Thiết kế kiến trúc State & Domain Model cho \`RoomFloorPlanEditor\` và \`InventoryStore\`.
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
