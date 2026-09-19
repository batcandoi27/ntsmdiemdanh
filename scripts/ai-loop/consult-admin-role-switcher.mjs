import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sendToChatGPTWeb, checkBridgeHealth, BRIDGE_URL, MODEL } from "./bridge-client.mjs";

const taskId = "TASK-ADMIN-ROLE-SWITCHER-001";
const topic = "Thẩm định & Nâng cấp Kế hoạch: Chức năng Chuyển đổi vai trò kiểm tra giao diện (Admin Role Impersonation / View-As Mode) cho Quản trị viên";

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${YYYY}-${MM}-${DD}_${hh}${mm}${ss}`;
}

async function main() {
  console.log("======================================================================");
  console.log("  TRIAD-AI ORCHESTRATOR — THAM VẤN CHATGPT WEB (ARCHITECT CONSULT)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ", port=" + health.data?.port + ")");

  // Read current draft implementation plan
  let currentPlan = "";
  const planPath = path.resolve("implementation_plan.md");
  if (fs.existsSync(planPath)) {
    currentPlan = fs.readFileSync(planPath, "utf-8");
  } else {
    const fallbackPath = path.resolve(".ai/plans/implementation_plan.md");
    if (fs.existsSync(fallbackPath)) currentPlan = fs.readFileSync(fallbackPath, "utf-8");
  }

  const prompt = `
# VAI TRÒ: SENIOR PRINCIPAL SOFTWARE ARCHITECT & PRODUCT VISIONARY
**Nhiệm vụ:** Thẩm định độc lập và Nâng cấp toàn diện Kế hoạch Triển khai tính năng **"Admin Role Impersonation / View-As Mode" (Chuyển đổi vai trò kiểm tra giao diện)** cho Web App Điểm danh & Quản lý Giáo dục THCS Trần Bội Cơ.

---

## 1. BỐI CẢNH DỰ ÁN & YÊU CẦU NGƯỜI DÙNG
- **Hệ thống:** Web App Điểm danh & Quản trị trường học (Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase DB & Auth).
- **Yêu cầu gốc từ Quản trị viên (Admin):**
  > *"Mày sửa code sao cho - khi admin đăng nhập thì bấm vào - có chức năng chuyển đổi thành Giám thị, Học sinh, Giáo viên chủ nhiệm ... toàn bộ các mục khác - để có thể kiểm tra giao diện người dùng mà ko cần đăng nhập - có thể quay lại trạng thái admin dễ dàng"*
- **Vị trí tương tác trên UI:** Thẻ người dùng trên Header (Desktop: \`👑 thcstbc Admin\` bo tròn kèm icon vương miện và nút Đăng xuất; Mobile: Thẻ user trong Drawer navigation).

---

## 2. BẢN KẾ HOẠCH DỰ THẢO HIỆN TẠI TỪ ANTIGRAVITY (PLAN A):
\`\`\`markdown
${currentPlan || "Chưa có file plan cụ thể."}
\`\`\`

---

## 3. THÔNG TIN KIẾN TRÚC HIỆN CÓ CỦA ỨNG DỤNG:
- **Hệ thống phân quyền RBAC (\`UserRole\`):**
  - \`admin\`: IT toàn quyền
  - \`principal\`: Hiệu trưởng / Phó HT (xem báo cáo, toàn trường)
  - \`supervisor\`: Giám thị (điểm danh nề nếp toàn trường, xem khối)
  - \`teacher\`: Giáo viên chủ nhiệm (quản lý lớp được gán \`assignedClassIds\`, trợ lý SYLL, xuất Word)
  - \`gvbm\`: Giáo viên bộ môn (điểm danh theo tiết/môn)
  - \`class_monitor\`: Ban cán sự (điểm danh lớp mình, giới hạn 30 phút)
- **Các Cổng chuyên biệt:**
  - \`/student\`: Cổng Học Sinh (Thế giới 2.5D, Thú cưng SVG, Làng học tập, Nhiệm vụ)
  - \`/portal\`: Cổng Phụ Huynh (Tra cứu chuyên cần, Sơ Yếu Lý Lịch, liên lạc GVCN)
  - \`/homeroom/students\`: Phân hệ Trợ lý GVCN & Duyệt hồ sơ học sinh
- **State Management:** \`AuthContext\` (\`src/context/auth-context.tsx\`) quản lý \`appUser\` (profile) và \`authUser\` (Supabase session). \`SiteHeader\` (\`src/components/site-header.tsx\`) tự động lọc menu điều hướng dựa trên \`appUser.role\`.

---

## 4. CÁC NỘI DUNG YÊU CẦU CHATGPT WEB THẨM ĐỊNH & PHẢN BIỆN:

1. **Thẩm định Kiến trúc & Đánh giá Rủi ro 5 Lớp (5-Layer Architectural Evaluation):**
   - **Lớp 1 - Auth & State Invariants:** Cơ chế giả lập nên lưu ở \`localStorage\` hay \`sessionStorage\`? Xử lý ra sao khi mở tab mới, khi reload trang, hoặc khi session Supabase hết hạn?
   - **Lớp 2 - Quyền Ghi & An Toàn Dữ Liệu Thực Tế (Write Safety & Sandbox vs Real DB):**
     Khi Admin đang "đóng vai" GVCN hoặc Học sinh: Token Supabase ở client vẫn là token của Admin. Nếu Admin vô tình bấm nút xóa học sinh, lưu điểm danh, hoặc đổi trạng thái, dữ liệu CSDL THẬT sẽ bị thay đổi! ChatGPT Web đề xuất cơ chế gì để bảo vệ? Có nên có cờ "Safe Mode / Read-Only Simulation" hoặc cảnh báo xác nhận rõ ràng?
   - **Lớp 3 - Context Switching & Dynamic Class Assignment:**
     Làm thế nào để khi Admin đóng vai GVCN (hoặc Ban cán sự), họ có thể chọn ngay một lớp học bất kỳ (ví dụ: \`7A10\`, \`6A1\`, \`7A8\`) để kiểm tra dữ liệu thật của lớp đó mà không cần sửa DB?
   - **Lớp 4 - UI/UX & Tương tác 1-chạm quay lại Admin:**
     Thiết kế thanh Banner giả lập (\`ImpersonationBanner\`) và Menu chuyển đổi (\`RoleSwitcherModal\`) ra sao để đảm bảo: Sang trọng, chuẩn màu giáo dục, không che khuất các nút bấm chính của trang (BottomNav trên mobile, Header trên desktop), và có phím tắt (Keyboard Shortcut) hoặc nút thoát 1 chạm tức thì?
   - **Lớp 5 - Performance & Zero Regression:**
     Đảm bảo việc switch role không làm re-render vô tận, không gây rò rỉ bộ nhớ, và không phá vỡ logic đăng xuất / bảo mật của tài khoản thật.

2. **6 KILLER FEATURES / UX DELIGHTERS ĐỀ XUẤT:**
   - Hãy đề xuất 6 tính năng đột phá nâng tầm trải nghiệm kiểm tra giao diện cho Quản trị viên trường học.

3. **BẢN KẾ HOẠCH NÂNG CẤP MASTER ARCHITECTURE (DROP-IN READY SPECIFICATION):**
   - Cung cấp kiến trúc giải pháp chuẩn xác, schema state, và code patterns mẫu hoàn chỉnh cho \`AuthContext\`, \`RoleSwitcherModal\`, và \`ImpersonationBanner\` để Antigravity có thể lập trình hoàn thiện 100% không vướng mắc.

*Vui lòng phản hồi chi tiết bằng tiếng Việt dưới định dạng Markdown chuẩn công nghiệp.*
`;

  console.log(`[*] Đang gửi gói tham vấn sang ChatGPT Web (Bridge: ${BRIDGE_URL})...`);
  const startTime = Date.now();
  const turnId = `turn_${randomUUID()}`;
  const threadId = `thread_${randomUUID()}`;

  const responseText = await sendToChatGPTWeb(prompt, taskId);
  const durationSec = Math.round((Date.now() - startTime) / 1000);

  console.log(`\n[✓] Nhận phản hồi thành công từ ChatGPT Web (${durationSec}s, ${responseText.length} ký tự).`);

  const timestamp = getTimestamp();
  const outDir = path.resolve(".ai", "consultations");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const planDir = path.resolve(".ai", "plans");
  if (!fs.existsSync(planDir)) fs.mkdirSync(planDir, { recursive: true });

  const headerMetadata = [
    "---",
    `task_id: "${taskId}"`,
    `topic: "${topic}"`,
    `bridge_endpoint: "${BRIDGE_URL}/v1/responses"`,
    `turn_id: "${turnId}"`,
    `thread_id: "${threadId}"`,
    `model_used: "${MODEL}"`,
    `response_timestamp: "${new Date().toISOString()}"`,
    `http_status: "200 OK"`,
    `raw_text_length: ${responseText.length}`,
    `duration_seconds: ${durationSec}`,
    "---",
    "",
    ""
  ].join("\n");

  const fullContent = headerMetadata + responseText;

  // Save to .ai/consultations/
  const consultFile = path.join(outDir, `${timestamp}_CONSULT_${taskId}_CHATGPT.md`);
  fs.writeFileSync(consultFile, fullContent, "utf-8");
  console.log(`[✓] Đã lưu tệp tham vấn vật lý: ${consultFile}`);

  // Save Plan B to .ai/plans/
  const planBFile = path.join(planDir, `${timestamp}_PLAN_${taskId}_PLAN-B-CHATGPT.md`);
  fs.writeFileSync(planBFile, fullContent, "utf-8");
  console.log(`[✓] Đã lưu tệp Plan B vật lý: ${planBFile}`);

  return { consultFile, planBFile, responseText, durationSec, turnId };
}

main().catch(err => {
  console.error("Lỗi khi tham vấn ChatGPT Web:", err.message);
  process.exit(1);
});
