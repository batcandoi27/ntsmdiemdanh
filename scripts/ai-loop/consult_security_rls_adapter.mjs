import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const TASK_ID = "TASK-SEC-RLS-ADAPTER-001";
const TOPIC = "Refactor SupabaseAdapter & Next.js: Xóa bỏ rò rỉ SUPABASE_SERVICE_ROLE_KEY và Bypass RLS, Chuẩn Hóa Kiến Trúc Least Privilege";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB PRINCIPAL ARCHITECT (TASK-SEC)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Lỗi kết nối Bridge 17841:", health.error);
    process.exit(1);
  }
  console.log(`[*] Bridge 17841 OK (service=${health.data?.service}, pid=${health.data?.pid})`);

  const prompt = `
# ROLE: PRINCIPAL CLOUD & DATABASE SECURITY ARCHITECT (ZERO-TRUST & LEAST PRIVILEGE)
Task ID: ${TASK_ID}
Topic: ${TOPIC}

## 1. BỐI CẢNH KIẾN TRÚC HIỆN TẠI (CURRENT STATE):
Ứng dụng Next.js 14 App Router quản lý trường học (app-diemdanh) kết nối Supabase PostgreSQL.
- \`src/services/supabase-adapter.ts\` là một class \`SupabaseAdapter implements DbAdapter\`.
- \`src/services/db.ts\` khởi tạo \`export const db = new SupabaseAdapter();\`.
- Cả Client Components (\`'use client'\`) và Server Components / Server Actions đều \`import { db } from '@/services/db'\`.
- Để hiển thị danh sách lớp và họ tên Giáo viên chủ nhiệm (GVCN) tại trang điểm danh, hệ thống cần query:
  \`classes -> teacher_classes(teacher_id, is_homeroom, profiles:profiles(full_name))\`.
- Trước đó, do bảng \`profiles\` bật RLS với chính sách \`auth.role() = 'authenticated'\`, khi Server Action hoặc người dùng chưa login gọi query, \`profiles\` bị RLS chặn trả về \`null\` (làm mất họ tên GVCN).
- Để giải quyết tạm thời, trong \`supabase-adapter.ts\` đã viết:
  \`\`\`ts
  private get client() {
      if (typeof window === 'undefined' && supabaseAdmin) {
          return supabaseAdmin;
      }
      return supabase;
  }
  \`\`\`
  trong đó \`supabaseAdmin\` được import từ \`@/lib/supabase-admin\`, mà file này chứa fallback hardcoded \`SUPABASE_SERVICE_ROLE_KEY\`.

## 2. VẤN ĐỀ BẢO MẬT & VI PHẠM TIÊU CHUẨN CẦN GIẢI QUYẾT:
1. **RÒ RỈ CHÌA KHÓA TỐI CAO (CLIENT BUNDLE LEAK RISK):** 
   Khi Client Components import \`db\` -> import \`supabase-adapter.ts\` -> import \`supabase-admin.ts\`, Webpack/Turbopack có nguy cơ đóng gói chuỗi tĩnh \`SUPABASE_SERVICE_ROLE_KEY\` vào Javascript bundle gửi về trình duyệt của người dùng! Kẻ tấn công có thể trích xuất token này và chiếm toàn quyền SUPERUSER trên database.
2. **PHÁ VỠ ROW-LEVEL SECURITY (RLS) DIỆN RỘNG (OVER-PRIVILEGE):**
   Biến \`this.client\` được dùng cho mọi thao tác ghi/xóa: \`saveAttendanceV3\`, \`saveStudent\`, \`deleteStudent\`, \`updateSettings\`. Nếu \`this.client\` dùng \`supabaseAdmin\` trên Server, TOÀN BỘ RLS của Supabase bị vô hiệu hóa cho mọi request, vi phạm nghiêm ngặt nguyên tắc Đặc quyền tối thiểu (Least Privilege).

## 3. YÊU CẦU THAM VẤN KIẾN TRÚC:
Hãy cung cấp bản kiến trúc giải pháp chuẩn công nghiệp (Industry Best Practices) bao gồm:
1. **Chính sách RLS chuẩn trên Supabase:** 
   - Bảng \`profiles\` nên viết Policy như thế nào để cho phép đọc thông tin công khai nội bộ (ví dụ: \`id, full_name, role\` của giáo viên) mà vẫn bảo vệ các trường nhạy cảm (SĐT, CCCD, email)?
   - Bảng \`teacher_classes\` và \`classes\` cần policy gì để client thông thường (anon) đọc được tên GVCN mà KHÔNG CẦN bất kỳ service_role key nào?
2. **Tái cấu trúc Code Base (Zero-Leak Guarantee):**
   - Làm thế nào để đảm bảo 100% \`supabase-adapter.ts\` và \`db.ts\` hoàn toàn sạch, không bao giờ import \`supabase-admin.ts\`?
   - Nếu cần xử lý tác vụ quản trị đặc biệt trên Server, nên tổ chức tách lớp ra sao (ví dụ: Server Actions riêng biệt, file \`server-only\`)?
3. **Mã nguồn giải pháp chi tiết (Drop-in Ready Code):**
   - File SQL migration cho Supabase RLS policies.
   - File \`src/services/supabase-adapter.ts\` đã được dọn sạch an toàn.
   - File \`src/lib/supabase-admin.ts\` được bảo vệ chống leak ra client (\`import 'server-only'\`, xóa bỏ hoàn toàn hardcoded fallback string).
4. **Kịch bản kiểm thử bảo mật (Red Team Verification Checklist):**
   - Cách kiểm tra client bundle không chứa chuỗi bí mật.
   - Cách xác minh RLS chặn được unauthorized update trong khi vẫn cho phép hiển thị tên GVCN.
`.trim();

  console.log("[*] Đang gửi yêu cầu tham vấn sang ChatGPT Web qua Bridge 17841...");
  const startTime = Date.now();
  const response = await sendToChatGPTWeb(prompt, TASK_ID);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[✓] Đã nhận phản hồi từ ChatGPT Web trong ${elapsed}s!`);

  // Lưu file với chuẩn INV-NAMING-CONVENTION-01
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  
  const outDir = path.resolve(".ai", "consultations");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  const outFile = path.join(outDir, `${timestamp}_CONSULT_${TASK_ID}_SECURITY_RLS.md`);
  const metaHeader = [
    `---`,
    `task_id: ${TASK_ID}`,
    `topic: ${TOPIC}`,
    `consultant: ChatGPT Web (Principal Macro Architect)`,
    `bridge_endpoint: http://127.0.0.1:17841/v1/responses`,
    `created_at: ${now.toISOString()}`,
    `elapsed_seconds: ${elapsed}`,
    `---`,
    "",
    response
  ].join("\n");

  fs.writeFileSync(outFile, metaHeader, "utf-8");
  console.log(`[✓] Bản tham vấn kiến trúc chính thức đã được lưu tại:\n    ${outFile}`);
}

main().catch(err => {
  console.error("[!] Lỗi tham vấn:", err);
  process.exit(1);
});
