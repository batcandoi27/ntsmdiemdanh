import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-ISOMETRIC-3D-PERSPECTIVE-AND-ANONYMITY-FIX-012";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (ISOMETRIC 3D SPRITE PERSPECTIVE, AUTO CLOCK LIGHTING & ZERO-ROSTER-LEAK ANONYMOUS CODES)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR 2.5D GAME GRAPHICS ENGINE ARCHITECT & PRIVACY SECURITY SPECIALIST
Task ID: ${taskId}
Topic: KHẮC PHỤC TRIỆT ĐỂ PHỐI CẢNH 3D NỘI THẤT ISOMETRIC, TỰ ĐỘNG HÓA 100% ÁNH SÁNG THEO ĐỒNG HỒ THẬT VÀ ẨN DANH HÓA TOÀN BỘ MÃ HỌC SINH BẰNG RANDOM HASH CODES

Kính gửi Senior Architect,

Người dùng đã gửi ảnh chụp màn hình và phản hồi 3 điểm rất chính xác:

---

## 1. PHÂN TÍCH 3 VẤN ĐỀ:

1. **Vấn đề 1: Đồ vật trong hình 3D (Isometric Room) đang bị bẹt phẳng 2D, không ăn khớp với mặt phẳng sàn 2.5D:**
   - Trong ảnh người dùng chụp: Đồ vật (như thảm, bàn, máy tính, tủ) đang là các khối flat 2D top-down dán thẳng lên SVG mà không được xoay/nghiêng theo mặt phẳng sàn Isometric (Isometric Surface Projection).
   - Hệ quả: Các món đồ trông như những tấm thẻ đồ chơi chữ nhật phẳng dựng đứng hoặc đè lấn lên bục đá, không tạo cảm giác phòng 3D thực thụ.
   - Cần thiết kế: **Ma trận biến đổi Phối Cảnh Isometric 2.5D (True 2.5D Isometric Floor Projection Matrix)**:
     * Mặt sàn Isometric là phép chiếu trục đo với góc nghiêng $30^\circ / 60^\circ$ hoặc ma trận \`rotate(-45) scale(1, 0.5)\` / \`matrix(0.7071, 0.3535, -0.7071, 0.3535, ...)\` có chân đế bóng đổ (Drop Shadow Extrusion).
     * Tọa độ các món đồ phải khớp chính xác với từng ô lưới sàn 8x8 của phòng, bục đá trung tâm nằm ở ô (3..4, 3..4), các món đồ đặt ở các ô khác sẽ nằm đúng vị trí sàn mà không bị chồng lấn dị dạng.

2. **Vấn đề 2: Chế độ Sáng / Chiều / Tối phải TỰ ĐỘNG 100% THEO ĐỒNG HỒ THỰC TẾ:**
   - Không để nút bấm tùy chỉnh thủ công.
   - Hệ thống tự động 100% lấy giờ của thiết bị người dùng (\`new Date().getHours()\`) để áp dụng ánh sáng:
     * 06:00 - 11:59: 🌅 Buổi Sáng (Ánh nắng vàng ban mai tươi sáng qua cửa sổ vòm).
     * 12:00 - 17:59: 🌇 Buổi Chiều (Ánh hoàng hôn cam ấm áp).
     * 18:00 - 05:59: 🌙 Buổi Tối (Ánh trăng sao đêm huyền bí, cửa sổ phát sáng).

3. **Vấn đề 3: Ẩn danh tuyệt đối — Bỏ toàn bộ số thứ tự lớp (\`8A13_01\`, \`8A13_02\`, ...):**
   - Trong trường học, nếu hiện \`8A13_01\`, \`8A13_02\`... thì học sinh sẽ đối chiếu danh sách sổ điểm danh và biết ngay ai là ai, làm mất hoàn toàn tính năng bảo mật ẩn danh!
   - Yêu cầu: Ngay từ đầu, **toàn bộ mã hiển thị phải là MÃ SỐ NGẪU NHIÊN ẨN DANH** (VD: \`8A13_#821\`, \`8A13_#459\`, \`8A13_#912\`... được băm ngẫu nhiên bảo mật từ seed hoặc bí danh) ở MỌI NƠI (Avatar, Bản đồ lớp, Nhà riêng, Bảng vinh danh, v.v.) để không ai có thể suy ngược ra tên thật học sinh.

---

## 2. YÊU CẦU THIẾT KẾ TỪ CHATGPT WEB:
1. Công thức toán học chiếu Isometric 2.5D phẳng theo mặt sàn cho các sprite nội thất.
2. Thiết kế cơ chế mã hóa Pseudo-Random Anonymous ID \`8A13_#XXX\` không trùng lặp và không tương ứng với STT điểm danh.
3. Kế hoạch nghiệm thu và kiểm thử Terminal.
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
