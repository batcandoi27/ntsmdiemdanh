import fs from 'node:fs';
import path from 'node:path';
import { sendToChatGPTWeb } from './bridge-client.mjs';

async function runAudit() {
  console.log('🚀 Starting Comprehensive AI Dev Loop Audit via ChatGPT Web Luna...');
  const taskId = 'TASK-AUDIT-SUFFIX-AND-MONITOR-COLUMNS';

  const auditPrompt = `
Bạn là Senior Principal Software Architect, Security Lead & Product UX Auditor độc lập trong hệ thống Triad-AI Development Loop Orchestrator.
Nhiệm vụ của bạn là thẩm định và AUDIT toàn diện chất lượng kỹ thuật, kiến trúc dữ liệu, tính toàn vẹn bảo mật và trải nghiệm người dùng đối với 2 hạng mục vừa được triển khai và hoàn thiện trên dự án Quản Lý Điểm Danh - Sổ Theo Dõi Học Sinh (THCS):

==================================================
HẠNG MỤC 1: KIẾN TRÚC HẬU TỐ TÊN HỌC SINH (NAME SUFFIX ARCHITECTURE) & QUY CHUẨN XẾP THỨ TỰ BỘ GIÁO DỤC
==================================================
1. Bối cảnh: Học sinh trùng tên trong cùng một lớp cần phân biệt bằng hậu tố (A, B, C...).
2. Quy chuẩn thứ tự của Bộ Giáo dục:
   - Trong cùng một lớp, nếu có học sinh trùng họ tên và ngày sinh, thứ tự A/B phải tuân thủ tuyệt đối mã định danh của Bộ (mã nhỏ hơn đứng trước: ví dụ 4250 là A, 4251 là B).
3. Bất biến chuyển lớp (Class Transfer Invariant):
   - Hậu tố A/B/C là thuộc tính theo ngữ cảnh lớp học (class-scoped), KHÔNG PHẢI họ tên khai sinh vĩnh viễn của học sinh.
   - Nếu học sinh chuyển sang lớp khác mà lớp đó không có ai trùng tên -> KHÔNG gắn hậu tố.
   - Nếu ở cùng lớp cũ thì hậu tố A, B phải được bảo toàn cố định, không bị đảo lộn khi có học sinh mới thêm vào hoặc chuyển đi.
4. Dữ liệu thực tế: Đã rà soát và chuẩn hóa danh sách học sinh trên Supabase PostgreSQL.

==================================================
HẠNG MỤC 2: KIẾN TRÚC SỔ THEO DÕI & CỘT TÙY CHỈNH (CUSTOM TRACKING COLUMNS & CLASS MONITOR)
==================================================
1. Sửa lỗi số lượng lớp ảo "Các lớp đang cấu hình (2)" nhưng chỉ hiện 1 badge "8A12":
   - Nguyên nhân: Bảng junction \`teacher_classes\` còn lưu lớp cũ năm 2025-2026. Trong khi \`db.getClasses()\` chỉ trả về lớp năm hiện tại (2026-2027). Số đếm nhãn lấy \`classIds.length\` (2) nhưng danh sách badge render theo \`selectedClasses\` (1).
   - Đã xử lý: Tính toán \`activeClassIds\` chỉ lấy các lớp thuộc năm học hiện tại, đồng thời thêm UI nút bấm chuyển đổi giữa các lớp trực quan (interactive class switching tabs).
2. Sửa lỗi "Bảo hiểm tai nạn" hiển thị ở năm học mới trong Cài Đặt nhưng mất tích trong trang Sổ theo dõi của lớp 8A12:
   - Nguyên nhân: Trước đó khi tạo sổ, mã \`class_id\` bị gán nhầm vào ID lớp cũ do chọn \`classIds[0]\`. Hàm \`isOldYearColumn\` bị sót điều kiện khi \`!targetClass\` (không tìm thấy lớp hiện tại) nên rơi vào nhánh hiển thị ở năm 2026-2027. Nhưng khi vào trang \`/classes/[id]/monitor\`, hệ thống truy vấn theo \`class_id\` của lớp 8A12 thì không có dữ liệu!
   - Đã xử lý:
     + Chuyển \`class_id\` của cột về đúng lớp 8A12 hiện tại.
     + Sửa hàm \`isOldYearColumn\`: nếu không thuộc các lớp năm học hiện tại (\`!targetClass\`), lập tức xếp vào nhóm Lịch Sử Năm Cũ để cô lập, không bao giờ để rò rỉ vào năm học mới.
     + Bảo toàn sổ cũ: Các sổ năm cũ chỉ ở chế độ xem và cho phép xoá dọn dẹp, không được chỉnh sửa làm sai lệch lịch sử.
3. Giải quyết trải nghiệm người dùng: Tạo sổ trực tiếp ngay tại trang Theo Dõi (\`/classes/[id]/monitor\`):
   - Trước đây: Empty state có link dẫn sang \`/settings\`, khiến giáo viên bị văng khỏi lớp đang quản lý, gây hoang mang và dễ cấu hình nhầm lớp khác.
   - Đã xử lý:
     + Tạo modal chuyên dụng \`CreateMonitorColumnModal\` ngay tại trang \`/classes/[id]/monitor\`.
     + Modal tự động khóa chặt vào đúng \`classId\` của lớp hiện tại, cho phép chọn loại sổ (Một lần / Định kỳ theo tháng/kỳ), nhập gợi ý nhanh, cấu hình VietQR và cổng Portal Phụ huynh.
     + Empty state và Header đều có nút "+ Tạo Sổ Mới Ngay" mở modal tại chỗ, bấm Lưu là danh sách cập nhật ngay lập tức.
     + Có liên kết phụ "⚙️ Cài đặt sổ" để mở tab cấu hình khi cần.
4. Ghi rõ phạm vi lớp học và đối tượng học sinh:
   - Thẻ sổ theo dõi (Column Card) được bổ sung badge định danh lớp: \`🏫 Lớp: [Tên lớp]\`.
   - Ghi rõ phạm vi: \`👥 Áp dụng cho tất cả học sinh lớp [Tên lớp] (X HS)\` hoặc \`👤 Nhóm chỉ định: Y học sinh (lớp [Tên lớp])\`.

==================================================
YÊU CẦU ĐÁNH GIÁ AUDIT TỪ CHATGPT WEB LUNA:
==================================================
Vui lòng đánh giá sâu và khách quan theo 5 tầng tiêu chuẩn:
1. Tính đúng đắn nghiệp vụ Sư phạm & Tiêu chuẩn Bộ Giáo dục (Pedagogical & Regulatory Standard).
2. Tính toàn vẹn kiến trúc dữ liệu & phân vùng Năm học (Academic Year Partitioning & Invariant Preservation).
3. Đánh giá UX Flow & Trải nghiệm Người dùng (User Experience, Context Preservation, Mental Model).
4. Phân tích lỗ hổng tiềm ẩn, Race Condition, Edge Cases (Data Leakage, Multi-tenant Isolation, RLS).
5. Kết luận nghiệm thu (FINAL VERDICT): Đạt (APPROVED) / Yêu cầu bổ sung (REQUEST_CHANGES) kèm khuyến nghị vận hành.
`;

  try {
    const response = await sendToChatGPTWeb(auditPrompt, taskId);
    console.log('✅ Audit response received from ChatGPT Web Luna!');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.join(process.cwd(), '.ai', 'audits');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, `${timestamp}_AUDIT_SUFFIX_AND_MONITOR_COLUMNS.md`);
    fs.writeFileSync(outPath, response, 'utf8');
    console.log(`📄 Audit report saved to: ${outPath}`);

    return { success: true, path: outPath, response };
  } catch (err) {
    console.error('❌ Audit failed:', err);
    return { success: false, error: err.message };
  }
}

runAudit().then(res => {
  if (!res.success) {
    process.exit(1);
  }
  console.log('🎉 Audit workflow completed successfully.');
});
