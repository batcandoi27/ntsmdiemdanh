import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-METAVERSE-STUDENT-SYNC-002";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (METAVERSE CLASS SYNC & HOVER STATS)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR GAME & DISTRIBUTED SYSTEMS ARCHITECT
Task ID: ${taskId}
Topic: ĐỒNG BỘ 100% HỌC SINH TRONG LỚP VÀO METAVERSE 2D, HIỂN THỊ MÃ ĐỊNH DANH, RICH HOVER POPUP & KHÓA BẢN ĐỒ THEO LEVEL

Kính gửi Senior Architect,

Người dùng yêu cầu tiếp tục nâng cấp và hoàn thiện phân hệ Metaverse Làng Lớp Học 2D trên Cổng Học Sinh với 4 chỉ thị cụ thể:

---

## 1. YÊU CẦU NGƯỜI DÙNG & TÍNH NĂNG ĐẶT HÀNG:

1. **Đồng Bộ 100% Số Học Sinh Trong Lớp Thành Bấy Nhiêu Quả Trứng/Linh Vật:**
   - Lớp có bao nhiêu học sinh (VD: 40-43 học sinh) thì tự động sinh và hiển thị đúng bấy nhiêu quả trứng/linh vật trên bản đồ.
   - Mỗi học sinh có một quả trứng được phân bổ vị trí sinh hoạt thích hợp:
     * Trứng Level 0 ở nhà riêng viền.
     * Thú đã nở (Level >= 1) sinh hoạt và đi dạo trong các phân khu trung tâm phù hợp với cấp độ của mình.

2. **Khóa Khu Vực Bản Đồ & Thông Báo Yêu Cầu Cấp Độ Khi Bấm Vào:**
   - Nếu học sinh đang xem/thao tác chưa đạt cấp độ tương xứng với phân khu (Ví dụ: Level 1 bấm vào Thư Viện Lv.5, Đấu Trường Lv.10, Rừng Vũ Trụ Lv.20):
     * Khi bấm vào ô đất của khu vực đó -> Lập tức hiển thị thông báo/modal: *"🔒 Khu vực này bị khóa! Cần đạt Cấp độ Level [X] để mở khóa và khám phá bản đồ khu vực này"*.
     * Hiển thị hiệu ứng mờ khóa (Lock Overlay / Fog of War) trực quan trên các ô chưa đủ cấp.

3. **Hiển Thị Tên Bằng Mã Định Danh & Cấp Độ:**
   - Nhãn hiển thị bên dưới linh vật/trứng trên lưới ma trận phải có định dạng: \`[Mã định danh] • Lv.[Cấp độ]\` (Ví dụ: \`8A13_01 • Lv.0\`, \`8A13_15 • Lv.3\`).

4. **Bảng Thông Tin Toàn Diện Khi Rê Chuột (Rich Hover Popover / Tooltip):**
   - Khi hover (rê chuột) vào bất kỳ con vật/trứng nào (hoặc tap trên mobile), hiển thị một Card/Popover nổi bật chứa toàn bộ thông tin chi tiết:
     * Mã định danh học sinh + Bí danh linh vật (Anonymous name).
     * Hình ảnh linh vật SVG (kèm màu sắc trứng cá nhân).
     * Cấp độ hiện tại (Level), Thanh tiến trình XP (Hiện tại / Cần thêm để lên cấp).
     * Sinh lực (%) + Chuỗi ngày chăm chỉ (Streak days).
     * Tài sản: Số Coins (🪙), Điểm thi đua / Điểm rèn luyện.
     * Số nhiệm vụ đã hoàn thành & Danh hiệu đạt được.
     * Phân khu đang sinh hoạt hiện tại.

---

## 2. YÊU CẦU THAM VẤN TỪ CHATGPT WEB:
Kính nhờ Senior Architect:
1. **Mô tả lại rõ ràng toàn bộ kiến trúc & đặc tả kỹ thuật** (Technical Specification) của 4 yêu cầu trên.
2. **Xác lập Kế hoạch thực thi (Execution Plan)** tối ưu, chia thành các bước rõ ràng để Antigravity tiến hành lập trình code và kiểm thử tự động đạt 100% chuẩn production.
`;

  console.log(`[*] Đang gửi yêu cầu tham vấn (${consultPrompt.length} ký tự) sang ChatGPT Web...`);
  const response = await sendToChatGPTWeb(consultPrompt, taskId);

  console.log("\n=================== PHẢN HỒI THIẾT KẾ TỪ CHATGPT WEB ===================");
  console.log(response);

  const outDir = path.resolve(".ai", "consultations");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${taskId}-ARCHITECTURAL-BLUEPRINT.md`);
  fs.writeFileSync(outFile, typeof response === "string" ? response : JSON.stringify(response, null, 2), "utf8");
  console.log(`[+] Đã lưu bản thiết kế tại: ${outFile}`);
}

main().catch(err => {
  console.error("[!] Lỗi thực thi:", err);
  process.exit(1);
});
