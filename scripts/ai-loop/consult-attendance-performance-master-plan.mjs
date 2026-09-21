import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { sendToChatGPTWeb, checkBridgeHealth, BRIDGE_URL, MODEL } from "./bridge-client.mjs";

const TASK_ID = "TASK-PERF-ATTENDANCE";
const PLAN_DIR = path.resolve(".ai", "plans", "PLAN-PERF-ATTENDANCE");

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — QUY TRÌNH THẨM VẤN KIẾN TRÚC MASTER PLAN (TRIAD-AI)");
  console.log("======================================================================");

  if (!fs.existsSync(PLAN_DIR)) {
    fs.mkdirSync(PLAN_DIR, { recursive: true });
  }

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log(`[*] Kết nối Bridge 17841: OK (pid=${health.data?.pid}, mode=${health.data?.mode})`);

  // Prompt thẩm vấn chi tiết gửi ChatGPT Web
  const consultPrompt = `
# ROLE: INDEPENDENT PRINCIPAL ARCHITECT & SENIOR PERFORMANCE REVIEWER
Task ID: ${TASK_ID}
Topic: TỐI ƯU HÓA HIỆU NĂNG TẢI & LƯU ĐIỂM DANH (ATTENDANCE PERFORMANCE REFACTORING)
Codebase Context: Next.js 14 App Router, TypeScript, Supabase PostgreSQL, TailwindCSS.

Kính gửi Principal Architect,

Chúng tôi đang rà soát hệ thống điểm danh của ứng dụng trường học (app-diemdanh).
Người dùng phản ánh: "App load chậm điểm danh khi mở danh sách lớp và khi lưu điểm danh".

Qua rà soát mã nguồn thực tế, Antigravity Code Lead đã phát hiện các điểm nghẽn nghiêm trọng sau:

1. KHI MỞ DANH SÁCH:
   - Trong \`src/services/attendance-v3-service.ts\` (\`getClassAttendance\` và \`getAttendanceByClasses\`), code đang chạy:
     \`dbClient.from('students').select('id, student_code, full_name')\`
     -> Quét toàn bộ bảng students của TOÀN TRƯỜNG (hàng ngàn học sinh) về server chỉ để map vài bản ghi vắng của 1 lớp!
   - Thác nước tuần tự 4 chặng trong \`AttendanceSheet.init()\`:
     \`getClassAndStudents\` -> \`getColumnsByFrequency\` -> \`getDailyRecords\` -> \`getClassAttendance\` (mỗi chặng đợi nhau).
   - Bảng từ điển \`attendance_statuses\` không có In-Memory cache, bị query lại liên tục.

2. KHI LƯU ĐIỂM DANH:
   - Trong \`AttendanceSheet.handleSave\`: Duyệt vòng lặp N học sinh * M custom columns để gọi \`saveDailyRecord\` hoặc \`deleteRecord\` riêng lẻ. Một lớp 45 em với 3 cột tuỳ chỉnh sẽ bắn **135 HTTP request riêng lẻ đồng thời** từ trình duyệt lên Supabase, làm nghẽn hoàn toàn HTTP socket của trình duyệt!
   - Trong \`batchMarkAttendance\`: 3 câu lệnh delete reset theo loại và 1 lệnh upsert chạy tuần tự.

BẮT BUỘC TUÂN THỦ NGUYÊN TẮC:
- **Strictly Preserve Existing Logic:** Giữ nguyên 100% mô hình Exception-Only V3 (học sinh có mặt = mặc định, chỉ lưu vắng/trễ/phép/vi phạm/khen thưởng), giữ nguyên cấu trúc Zalo webhook alert bất đồng bộ, không làm thay đổi hay phá vỡ quan hệ database PostgreSQL Supabase hiện hữu.

YÊU CẦU THẨM VẤN ĐỘC LẬP (PLAN B):
Xin Principal Architect đưa ra bản thiết kế độc lập (Plan B) toàn diện:
1. Đánh giá và xác nhận các điểm nghẽn kỹ thuật nêu trên.
2. Đề xuất kiến trúc giải quyết triệt để cho luồng Mở danh sách (Data Fetch Scoping, In-memory Dict Cache, Parallel Init).
3. Đề xuất giải pháp triệt tiêu cơn bão 135 request khi lưu Custom Columns (Batch Daily Records Server Action, Dirty Diff Tracking).
4. Phân tích các rủi ro biên (Edge cases, Race condition khi 2 giáo viên cùng sửa, Zalo webhook failure, Cache invalidation).
5. Đưa ra Bảng so sánh Before vs After và các chỉ số SLO cam kết (Latency, Requests count, DB Roundtrips).
6. Khuyến nghị cấu trúc Server Action chuẩn Drop-in Ready.
`;

  console.log("[*] Đang gửi yêu cầu thẩm vấn sang ChatGPT Web (Luna/High)...");
  const requestHash = crypto.createHash("sha256").update(consultPrompt).digest("hex");
  const startTime = Date.now();

  const responseText = await sendToChatGPTWeb(consultPrompt, TASK_ID);
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[+] ChatGPT Web đã phản hồi thành công sau ${elapsedSec}s! (Độ dài: ${responseText.length} ký tự)`);

  const responseHash = crypto.createHash("sha256").update(responseText).digest("hex");

  // Lưu 02-plan-b.md kèm phong bì minh chứng (Evidence Envelope)
  const planBFile = path.join(PLAN_DIR, "02-plan-b.md");
  const planBContent = `---
evidence_id: EVD-${new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14)}-CHATGPT-PLAN-B
bridge_endpoint: ${BRIDGE_URL}/v1/responses
model_used: ${MODEL}
turn_timestamp: ${new Date().toISOString()}
request_hash: ${requestHash}
response_hash: ${responseHash}
http_status: 200 OK
elapsed_seconds: ${elapsedSec}
---

# PLAN B: KIẾN TRÚC TỐI ƯU HÓA HIỆU NĂNG ĐIỂM DANH (CHATGPT WEB PRINCIPAL ARCHITECT)
**Đơn vị thẩm định:** ChatGPT Web (Luna Architect Engine)  
**Thời gian thẩm vấn:** ${new Date().toLocaleString("vi-VN")}  
**Mã nhiệm vụ:** ${TASK_ID}  

${responseText}
`;

  fs.writeFileSync(planBFile, planBContent, "utf8");
  console.log(`[✓] Đã tạo thành công hồ sơ thẩm vấn: ${planBFile}`);
}

main().catch(err => {
  console.error("[!] Lỗi thực thi thẩm vấn:", err);
  process.exit(1);
});
