import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-METAVERSE-2D-001";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (METAVERSE 2D UPGRADE ARCHITECTURE)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR GAME ARCHITECT & DISTRIBUTED FRONTEND LEAD
Task ID: ${taskId}
Topic: NÂNG CẤP TOÀN DIỆN METAVERSE LÀNG LỚP HỌC 2D (QUY HOẠCH KHÔNG GIAN, TÙY BIẾN TRỨNG & WANDERING AI DI CHUYỂN SINH ĐỘNG)

Kính gửi Senior Architect & Reviewer,

Người dùng đã gửi yêu cầu nâng cấp không gian Metaverse Làng Lớp Học 2D trên Cổng Học Sinh (dựa trên giao diện ma trận 8x8 hiện tại) với các yêu cầu cốt lõi sau:

---

## 1. YÊU CẦU NGƯỜI DÙNG & TÍNH NĂNG ĐẶT HÀNG
1. **Hệ Thống Khởi Tạo & Tùy Biến Trứng (Egg Customization):**
   - Mọi học sinh mới vào đều có sẵn một quả trứng (Level 0).
   - Được quyền setting / custom màu sắc ban đầu (Color Palette / HEX color picker) để tạo dấu ấn cá nhân khác biệt.
   - SVG quả trứng render màu sắc này, có hiệu ứng rung rinh (shake/bounce nhẹ) khi chưa nở.

2. **Quy Hoạch Bản Đồ (Grid Zoning Architecture - 8x8 Grid = 64 Ô):**
   - **Khu Dân Cư (4 Cạnh Viền - 28 Ô):** Tọa độ viền [x=0, y], [x=7, y], [x, y=0], [x, y=7]. Đây là "Nhà Riêng" cố định của từng học sinh trong lớp.
   - **Không Gian Công Cộng (Vùng Trung Tâm - 36 Ô từ [1,1] đến [6,6]):** Nơi giao lưu chung của các thú đã nở.
   - **Phân khu chức năng & Khóa theo cấp độ (Level-Gating):**
     * *Khu Công Viên Giao Lưu (Central Plaza):* min_level: 1 (Mở ngay khi trứng nở).
     * *Khu Học Tập & Thư Viện Tri Thức (Library Hub):* min_level: 5.
     * *Khu Đấu Trường / Sáng Tạo (Arena / Innovation Lab):* min_level: 10.
     * *Khu Rừng Phép Thuật / Vũ Trụ (Cosmic Forest):* min_level: 20.

3. **Vòng Đời Linh Vật & Thuật Toán Wandering AI (AI Di Chuyển Tự Do):**
   - **Chưa nở (Level 0, is_hatched = false):** Nằm yên tại Nhà viền của học sinh.
   - **Đã nở (Level >= 1, is_hatched = true):** Rời nhà bước vào khu công cộng trung tâm.
   - **Wandering AI:** Mỗi 3-5 giây, thú tự động chọn ngẫu nhiên 1 ô lân cận (hoặc ô đích đến) trong vùng công cộng mà thú ĐỦ LEVEL để bước vào.

4. **Frontend & Hiệu Ứng Chuyển Động Mượt Mà (Render Animation):**
   - Di chuyển mượt mà dạng slide / tweening (CSS transition / transform translate) trong 1.5s, không giật cục nhảy cóc (no teleportation).
   - Lật mặt thông minh (Flip facing direction: scaleX(-1) khi đi sang trái).
   - Hiển thị tooltip / drawer chi tiết khi click, hiển thị danh hiệu ẩn danh, cấp độ, bong bóng chat / biểu cảm (emotes).

---

## 2. HIỆN TRẠNG CODEBASE HIỆN TẠI
- **Bảng Database Supabase:**
  - \`student_pets\`: (id, student_id, class_id, anonymous_name, evolution_branch, level, current_xp, vitality_percent, is_hibernating, total_coins...)
  - \`student_world_plots\`: (id, class_id, pet_id, grid_x, grid_y, plot_theme, building_item_code, decorations...)
- **Component Giao Diện:**
  - \`src/components/student/classroom-world-grid.tsx\`: Lưới 8x8 render theo ma trận \`gridMatrix[y][x]\`.
  - \`src/components/student/svg-pet.tsx\`: Render SVG Pet 5 giai đoạn hình thái (0: Trứng, 1-4: Trứng nứt vỏ, 5-9: Sơ sinh, 10-19: Thiếu niên có cánh, 20+: Tối thượng).
  - \`src/app/student/map/page.tsx\` & \`src/app/student/page.tsx\`.

---

## 3. YÊU CẦU THAM VẤN TỪ CHATGPT WEB
Kính nhờ Senior Architect:
1. **Viết lại bản Đặc tả Kỹ thuật Toàn diện & Rõ Ràng (Comprehensive Technical Specification & Architecture Blueprint)** bằng tiếng Việt chuẩn chỉ, chi tiết từ Schema Database, Type Definitions, Zoning Matrix Engine, Wandering AI State Machine, đến Component Architecture.
2. **Thiết kế Kế Hoạch Triển Khai Thực Thi (Execution Plan)** phân chia thành các Phase rõ ràng, khả thi để Antigravity tiến hành lập trình ngay lập tức và đảm bảo 0 lỗi biên dịch, 0 gián đoạn trải nghiệm người dùng.
`;

  console.log(`[*] Đang gửi yêu cầu tham vấn Metaverse 2D (${consultPrompt.length} ký tự) sang ChatGPT Web...`);
  const response = await sendToChatGPTWeb(consultPrompt, taskId);

  console.log("\n=================== PHẢN HỒI THIẾT KẾ TỪ CHATGPT WEB ===================");
  console.log(response);

  // Lưu lại vào .ai/consultations/
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
