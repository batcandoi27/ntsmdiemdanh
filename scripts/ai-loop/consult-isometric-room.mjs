import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-ISOMETRIC-ROOM-2D-005";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (ISOMETRIC 2D ROOM & TOP-DOWN HOUSE)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR 2D GAME GRAPHICS & UI/UX ARCHITECT
Task ID: ${taskId}
Topic: THIẾT KẾ PHÒNG CĂN CỨ 2D ISOMETRIC / TOP-DOWN CHO 28 NGÔI NHÀ HỌC SINH (THEO ẢNH MẪU ĐẶT HÀNG)

Kính gửi Senior Architect,

Người dùng đã gửi ảnh thiết kế mẫu (target UI screenshot) cho giao diện Tham Quan Nhà Riêng (House Tour Modal):
- Căn phòng dạng 2D Isometric / Top-Down Cutaway (Cắt lớp nhìn chéo từ trên xuống như game Animal Crossing / Habbo / SimCity).
- Trong phòng có:
  1. Sàn gỗ / đá / kim loại Isometric với thảm lông ấm áp ở giữa.
  2. Bệ thờ / Bục trưng bày trung tâm đặt Quả trứng thần bí hoặc Thú cưng SVG phát sáng hào quang ma thuật.
  3. Giường ngủ Isometric đặt ở góc trái phòng kèm chăn gối.
  4. Bàn trà / Bàn làm việc Isometric đặt ở góc phải kèm tách trà nóng bốc khói hoặc máy tính.
  5. Hai cửa sổ kính vòm trên tường chiếu ánh trăng / sao đêm vào phòng, dây leo quấn quanh tường gỗ.
  6. Lời chào thoại dạng bong bóng bay đặt ở đáy phòng.
  7. Hiển thị trực quan tương ứng cho cả 4 Theme kiến trúc (Nhà Gỗ Cozy, Trạm Không Gian, Lâu Đài Pha Lê, Vườn Cổ Tích).

Kính nhờ Senior Architect:
1. Thiết kế kiến trúc Component SVG / CSS Isometric 2D thuần vector siêu nhẹ, mượt mà, co giãn responsive 100% trên cả Desktop và Mobile.
2. Xác lập Execution Plan để Antigravity triển khai code và kiểm thử tự động.
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
