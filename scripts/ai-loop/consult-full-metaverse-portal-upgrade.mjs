import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-METAVERSE-PORTAL-INTEGRATION-UPGRADE-011";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (METAVERSE PORTAL INTEGRATION & 6 ADVANCED FEATURES)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR FULL-STACK METAVERSE & UI/UX ARCHITECT
Task ID: ${taskId}
Topic: NÂNG CẤP TOÀN DIỆN CỔNG HỌC SINH: 6 TÍNH NĂNG ĐỒNG BỘ & TRẢI NGHIỆM METAVERSE

Kính gửi Senior Architect,

Người dùng yêu cầu 6 hạng mục nâng cấp quan trọng:

---

## 1. PHÂN TÍCH 6 HẠNG MỤC YÊU CẦU:

1. **Bộ Upload Minh Chứng Google Drive & File Trực Tiếp:**
   - Trong form nộp nhiệm vụ tuần: Thêm nút Tải File/Ảnh trực tiếp từ máy (có preview ảnh thumbnail) và input Google Drive / YouTube có nút kiểm tra link tự động.

2. **Vạch / Sao Cấp Bậc Trực Tiếp Trên Hình Sinh Vật (Rank Insignia on SvgPet):**
   - Vẽ trực tiếp Huy hiệu cấp bậc (1..5 Stars ⭐ hoặc Vạch Rank Insignia) ngay trên sprite SVG của Quả Trứng / Thú Cưng để phân biệt đẳng cấp trực quan.

3. **Toàn Bộ 43 Sinh Vật Của Lớp Hoạt Động Sống Động Ở Quảng Trường Trung Tâm:**
   - Không giới hạn 9 sinh vật (3x3). Toàn bộ 43 học sinh trong lớp đều có linh vật hiện diện ở không gian mở trung tâm, di chuyển nhấp nhô lượn sóng tự do sinh động.

4. **Điều Chỉnh Kinh Tế Cửa Hàng (Giá Vật Phẩm Cân Bằng Hơn):**
   - Nâng giá các món đồ trong Shop lên mức phù hợp (80 - 450 Xu) để tạo động lực tích lũy qua nhiều nhiệm vụ và thi đua.

5. **Đồng Bộ Tọa Độ Nội Thất Giữa Mặt Bằng & Phối Cảnh + Hiệu Ứng Ánh Sáng 3 Buổi (Sáng / Chiều / Tối):**
   - Trong \`IsometricRoomView\`: Đọc danh sách \`floorPlan.placedItems\` và render đúng tọa độ Isometric 2D thay vì mockup tĩnh.
   - Thêm hệ thống quang cảnh 3 buổi (Sáng: 06h-12h, Chiều: 12h-18h, Tối: 18h-06h) với gradient bầu trời và ánh sáng cửa sổ thay đổi theo thời gian thực hoặc nút chọn buổi.

6. **Tích Hợp Metaverse Làng Lớp Học Trực Tiếp Lên Trang Tổng Quan (\`/student\`):**
   - Nhúng \`ClassroomWorldGrid\` ngay trên trang chủ \`/student\` để học sinh vừa đăng nhập là thấy ngay không gian lớp học sống động. Chuyển phần chi tiết nhiệm vụ sang \`/student/quests\`.

---

## 2. YÊU CẦU THAM VẤN TỪ CHATGPT WEB:
1. Thiết kế kiến trúc ánh xạ tọa độ Isometric từ FloorPlan.
2. Thiết kế Rank Insignia trên SvgPet và hệ thống ánh sáng 3 buổi (Day/Dusk/Night).
3. Xác lập Execution Plan để Antigravity triển khai code và kiểm thử tự động.
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
