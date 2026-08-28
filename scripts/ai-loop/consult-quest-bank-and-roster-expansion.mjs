import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-QUEST-BANK-ROSTER-FULL-EXPANSION-010";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (20+ QUESTS PER GROUP, WEEKLY ALGO, ANONYMOUS LEADERBOARD & FULL 43+ ROSTER HOUSES)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR GAMIFICATION ARCHITECT & CURRICULUM SPECIALIST
Task ID: ${taskId}
Topic: NGÂN HÀNG 80+ NHIỆM VỤ (20+ MỖI NHÓM), THUẬT TOÁN GIAO NHIỆM VỤ TUẦN, BẢNG VINH DANH CHỈ HIỆN BÍ DANH & MỞ RỘNG TOÀN BỘ 43+ HỌC SINH CĂN CỨ

Kính gửi Senior Architect,

Người dùng yêu cầu 4 nội dung quan trọng:

---

## 1. PHÂN TÍCH YÊU CẦU:

1. **Bảng Vinh Danh Top XP Leaderboard:**
   - Ẩn toàn bộ mã định danh (mã học sinh như \`8A13_43\`), CHỈ hiển thị Bí Danh Ẩn Danh (Anonymous Nickname) kèm Icon/Linh vật để bảo vệ quyền riêng tư.

2. **Thuật Toán Giao Nhiệm Vụ Tuần Cố Định (Deterministic Weekly Quest Assignment):**
   - Mỗi tuần mỗi học sinh được thuật toán giao cố định 1 nhiệm vụ duy nhất (không cho tự do chọn, random theo tuần bằng seed \`hash(studentId + weekOfYear + year)\`).
   - Sau khi học sinh nộp bài: Cho phép xem lại chi tiết bài nộp, chỉnh sửa/cập nhật minh chứng trước khi giáo viên chấm điểm.

3. **Ngân Hàng Ít Nhất 20 Nhiệm Vụ Ở Mỗi Nhóm (Tổng cộng $\\ge 80$ nhiệm vụ):**
   - Nhóm 1: **Chuyên Cần & Nề Nếp Kỷ Luật** (20 nhiệm vụ thiết thực, lành mạnh).
   - Nhóm 2: **Học Tập, Tiến Bộ & Tri Thức** (20 nhiệm vụ tự học, giải đề, đọc sách).
   - Nhóm 3: **Phong Trào Đoàn Thể & Phối Hợp Đội Nhóm** (20 nhiệm vụ hỗ trợ bạn bè, trực nhật, hoạt động tập thể).
   - Nhóm 4: **Gia Đình, Kỹ Năng Sống & Rèn Luyện Bản Thân** (20 nhiệm vụ hiếu thảo, phụ giúp cha mẹ, thể thao).

4. **Mở Rộng Danh Sách Căn Cứ Cho Toàn Bộ Học Sinh Lớp (43+ Học Sinh):**
   - Lớp có 43+ học sinh thì Danh mục Căn Cứ phải hiển thị đầy đủ 43/43 căn cứ, mỗi học sinh đều có nhà riêng, không bị giới hạn 28. Phân bổ khu dân cư thông minh (Tầng/Khu Phố A-B).

---

## 2. YÊU CẦU TỪ CHATGPT WEB:
1. Soạn thảo danh mục 80+ nhiệm vụ chi tiết (Title, Description, Category, XP, Xu, Hint).
2. Thiết kế thuật toán phân bổ nhiệm vụ tuần và mở rộng hệ thống căn cứ 43+ học sinh.
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
