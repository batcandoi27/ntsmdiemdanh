import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-METAVERSE-MASTER-UPGRADE-003";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (MASTER PLAN CỔNG HỌC SINH & METAVERSE)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR GAME & ENTERPRISE FULLSTACK ARCHITECT
Task ID: ${taskId}
Topic: MASTER PLAN NÂNG CẤP TOÀN DIỆN CỔNG HỌC SINH /student & METAVERSE LÀNG LỚP HỌC 2D

Kính gửi Senior Architect & Reviewer,

Người dùng đã gửi gói yêu cầu nâng cấp Master hoàn chỉnh cho Cổng Học Sinh. Hãy phân tích, diễn giải lại kỹ thuật thật chi tiết và đề xuất phương án kiến trúc cho từng hạng mục:

---

## 1. YÊU CẦU NGƯỜI DÙNG & TÍNH NĂNG MASTER ĐẶT HÀNG:

1. **Google Drive In-Place Upload & OAuth Persistent Session:**
   - Link nộp minh chứng bài tập: Đề xuất giải pháp cho phép học sinh đăng nhập Google một lần (OAuth2 / Google Apps Script Webhook Token lưu tại localStorage) và upload trực tiếp ảnh/video tại chỗ vào Google Drive mà không phải mở tab ngoài thủ công.

2. **Chuẩn Hóa Nhãn Định Danh Trực Quan:**
   - Nhãn dưới chân con vật/trứng trên bản đồ rút gọn thành: \`8A13_XX\` (bỏ đoạn \`• Lv.Y\` ở nhãn dưới để bản đồ thoáng gọn; cấp độ chuyển vào Badge/Tooltip).

3. **Cơ Chế Hạn Ngạch Sửa Đổi & "Phiếu Tẩy Tủy" (Rebirth / Reset Rights Token):**
   - Bí danh (Nickname): Chỉ được đặt 1 lần ban đầu khi khởi tạo.
   - Nhánh tiến hóa (Evolution branch): Được sửa tối đa 3 lần.
   - Màu trứng (Egg color): Được đổi 1 lần mỗi tháng.
   - Khi hết lượt: Người dùng bị khóa cố định. Để sửa tiếp, học sinh phải đạt top thi đua/nhiệm vụ tháng để nhận **"Phiếu Tẩy Tủy" (Rebirth Token)** đặc biệt.

4. **Mức Cấp Độ Khởi Tạo Chuẩn (Level 1 Baseline) & Phân Biệt Giới Tính SVG (Nam/Nữ):**
   - Toàn bộ học sinh trong lớp khi mới khởi tạo đều bắt đầu từ **Level 1** (đồng nhất, không random cấp độ cao), lớp có bao nhiêu học sinh thì sinh đúng bấy nhiêu trứng/thú.
   - Tự động nhận diện giới tính từ Database (\`gender: 'male' | 'female'\`) để gắn phụ kiện/hào quang SVG phân biệt tinh tế (nơ/vương miện/aura phong cách).

5. **Top 3 Floating Podium Toàn Cục & Bảng Xếp Hạng Đa Hạng Mục:**
   - Luôn hiển thị thanh **Top 3 Vinh Danh** nổi bật ở tất cả các trang con trong Cổng Học Sinh (\`/student/*\`).
   - Bảng xếp hạng Lớp học đa dạng theo từng tab: Top XP, Top Chuỗi Ngày (Streak), Top Nhiệm Vụ Hoàn Thành, Top Thi Đua Nề Nếp.

6. **Ngân Hàng Nhiệm Vụ Phong Phú & Quy Tắc Giới Hạn Tuần:**
   - Bổ sung nhiều nhiệm vụ đa dạng phong phú cho 5 nhóm (Học tập, Thói quen sống, Giao tiếp bạn bè, Tư duy phản biện, Kỹ năng sinh tồn).
   - **Quy tắc:** Mỗi tuần, ở mỗi nhóm nhiệm vụ, học sinh chỉ được chọn thực hiện **duy nhất 1 nhiệm vụ**.

7. **Tham Quan Nhà Riêng Học Sinh (Residential House Tour Modal):**
   - Nhấp vào bất kỳ ô Nhà riêng nào trên 28 ô viền -> Mở giao diện **Tham Quan Nhà Riêng (House Tour)**: Xem bối cảnh phòng, đồ nội thất, bộ sưu tập thú cưng, cúp thành tích và có nút "Thả Tim / Thăm Nhà" (❤️).

8. **Bỏ Yêu Cầu Tờ Giấy Ghi Bí Danh:**
   - Form nộp minh chứng nhiệm vụ không cần yêu cầu học sinh chụp kèm mảnh giấy ghi bí danh nữa vì hệ thống đã tự động đính kèm metadata học sinh và GVCN có thể tra cứu trực tiếp.

9. **Mở Rộng Cửa Hàng Vật Phẩm Ảo (Virtual Shop Expansion):**
   - Bổ sung thêm nhiều danh mục: Nội thất nhà (Giường, bàn học, thảm, tranh treo tường), Trang sức & Phụ kiện (Mũ phù thủy, cánh rồng, kính râm), Giấy dán tường, Đèn neon ma thuật.

---

## 2. YÊU CẦU THAM VẤN TỪ CHATGPT WEB:
Kính nhờ Senior Architect:
1. **Diễn giải lại chi tiết và chuẩn hóa toàn bộ đặc tả kỹ thuật (Comprehensive Architectural Blueprint)** cho 9 hạng mục trên.
2. **Thiết kế Kế hoạch Thực thi (Master Execution Plan)** phân chia theo các phase nguyên tử, có tiêu chí kiểm định và acceptance criteria rõ ràng.
`;

  console.log(`[*] Đang gửi yêu cầu tham vấn Master Plan (${consultPrompt.length} ký tự) sang ChatGPT Web...`);
  const response = await sendToChatGPTWeb(consultPrompt, taskId);

  console.log("\n=================== PHẢN HỒI THIẾT KẾ MASTER TỪ CHATGPT WEB ===================");
  console.log(response);

  const outDir = path.resolve(".ai", "consultations");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${taskId}-MASTER-BLUEPRINT.md`);
  fs.writeFileSync(outFile, typeof response === "string" ? response : JSON.stringify(response, null, 2), "utf8");
  console.log(`[+] Đã lưu bản thiết kế Master tại: ${outFile}`);
}

main().catch(err => {
  console.error("[!] Lỗi thực thi:", err);
  process.exit(1);
});
