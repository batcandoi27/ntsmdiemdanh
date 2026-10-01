import fs from 'node:fs';
import path from 'node:path';
import { sendToChatGPTWeb } from './bridge-client.mjs';

async function runAudit() {
  console.log('🚀 Starting Final AI Dev Loop Audit for Composite Multi-Column Monitor via ChatGPT Web Luna...');
  const taskId = 'TASK-AUDIT-COMPOSITE-MONITOR-001';

  const auditPrompt = `
Bạn là Senior Principal Software Architect, Security Lead & Product UX Auditor độc lập trong hệ thống Triad-AI Development Loop Orchestrator.
Nhiệm vụ của bạn là AUDIT toàn diện chất lượng kỹ thuật, tính toàn vẹn kiến trúc dữ liệu, khả năng mở rộng và trải nghiệm người dùng đối với tính năng vừa hoàn thiện:

==================================================
TÍNH NĂNG: SỔ THEO DÕI HOẠT ĐỘNG MỘT LẦN NHIỀU CỘT (COMPOSITE MULTI-COLUMN MONITOR SHEET) & BỘ XUẤT BÁO CÁO EXCEL TỔNG HỢP ĐA HOẠT ĐỘNG
==================================================

1. BỐI CẢNH & YÊU CẦU NGƯỜI DÙNG:
   - Giáo viên cần quản lý và gộp nhiều hoạt động một lần (Bảo hiểm tai nạn, Bán trú, Tham gia hội thao...) vào một bảng theo dõi ma trận hợp nhất.
   - Hỗ trợ thêm/bớt cột động cho từng hoạt động.
   - Mỗi cột/hoạt động có tùy chọn "Ghi chú kế bên tùy ý" (để điền ăn chay, ngủ riêng, thông tin bổ sung...).
   - Hỗ trợ nhiều loại cột con:
     + Bảo hiểm tai nạn: Có / Không (Checkbox boolean)
     + Bán trú: Đăng ký (Checkbox) + Ghi chú (ăn chay, ngủ riêng, v.v.)
     + Hội thao: Cờ tướng, Cờ vua, Kéo co... (Nhiều cột con checklist)
   - Cho phép tùy chọn cột/hoạt động để xuất báo cáo / xuất Excel (.xlsx) chuẩn biểu mẫu hành chính Bộ Giáo dục (Quốc hiệu tiêu ngữ, 2 tầng header gộp ô, cột STT/Mã HS/Họ tên cố định, dòng tổng cộng, khối chữ ký).

2. KIẾN TRÚC ĐÃ TRIỂN KHAI THEO 7 TRỤ CỘT BẤT BIẾN (INVARIANTS):
   - Trụ cột 1 (Zero Breaking Changes): Giữ nguyên 100% bảng 'columns' và 'column_records'. Các cột sổ theo dõi cũ có 'activity_config IS NULL' vẫn hoạt động trơn tru ở chế độ Sổ riêng lẻ.
   - Trụ cột 2 (Parent-Child Column Hierarchy):
     + Cột cha (Activity Header): 'parent_column_id = null', 'activity_config.type = "composite"'.
     + Cột con (Sub-column / Item): 'parent_column_id = parent.id', 'activity_config.type = "field"'.
   - Trụ cột 3 (Atomic Records): Mỗi ô dữ liệu được lưu thành 1 bản ghi riêng biệt trong 'column_records' với id='\${childColId}_\${studentCode}'. Tuyệt đối không dùng monolithic JSON lưu chung một hàng để triệt tiêu hoàn toàn race condition và merge conflicts.
   - Trụ cột 4 (Ghi chú kế bên là First-class Sub-column): Cột ghi chú được sinh ra dưới dạng một child column có 'dataType = "text"', 'isNotesColumn = true', thống nhất hoàn toàn luồng lưu trữ, hiển thị inline và xuất Excel.
   - Trụ cột 5 (Archive First): Ẩn cột hoặc ẩn hoạt động bằng cờ 'archived = true', không xóa vật lý để bảo toàn lịch sử dữ liệu.
   - Trụ cột 6 (Decoupled Consolidated Export Engine): Module 'composite-export-service.ts' sử dụng ExcelJS dựng cấu trúc 2 tầng Header merged (Tầng 1: Tên hoạt động cha gộp các cột con; Tầng 2: Tên cột con chi tiết), áp dụng ký hiệu tick '✓' hoặc 'X', căn giữa, viền mỏng chuẩn Bộ GD&ĐT.
   - Trụ cột 7 (Bất biến phân quyền & cách ly dữ liệu): Cột con bắt buộc kế thừa 'class_id' từ cột cha khi khởi tạo ('applicableScope', 'applicableStudentIds').

3. CÁC FILE ĐÃ TRIỂN KHAI VÀ KIỂM THỬ:
   - Migration: 'scripts/migrate-composite-columns.mjs' (thêm parent_column_id, activity_config, display_config, schema_version).
   - Types: 'src/types/models.ts' (bổ sung Column, CompositeActivityConfig, ColumnDisplayConfig, ActivityType, FieldDataType, FieldInputMode).
   - Column Service: 'src/services/column-service.ts' ('createCompositeActivityWithChildren', 'getCompositeActivitiesForClass', 'addChildColumnToActivity').
   - Record Service: 'src/services/record-service.ts' ('batchSaveMatrixRecords', 'getRecordsForColumns').
   - Export Service: 'src/services/composite-export-service.ts' ('exportCompositeMatrixToExcel').
   - UI Components:
     + 'src/components/monitor/create-composite-activity-modal.tsx' (Modal tạo hoạt động nhiều cột kèm ghi chú nhanh).
     + 'src/components/monitor/composite-matrix-grid.tsx' (Bảng ma trận nhiều cột, sticky 3 cột đầu, checkbox 0ms latency + debounced batch save, quick fill toàn lớp, thêm cột con trực tiếp).
     + 'src/components/monitor/export-column-selector-modal.tsx' (Modal chọn cây hoạt động/cột con xuất Excel, chọn ký hiệu ✓/X, đổi tiêu đề).
     + 'src/app/classes/[id]/monitor/page.tsx' (Bộ chuyển đổi View Mode giữa Ma Trận Nhiều Cột và Sổ Riêng Lẻ).
   - Integration Smoke Test: 'scripts/test-composite-services.ts' -> Đạt 100% (Typecheck 0 errors, CRUD parent/child, batch save 3 ô, query kiểm tra đúng giá trị, dọn dẹp sạch sẽ).

==================================================
YÊU CẦU ĐÁNH GIÁ AUDIT TỪ CHATGPT WEB LUNA:
==================================================
Vui lòng đánh giá khách quan và nghiêm ngặt theo các tiêu chí:
1. Kiểm tra tính toàn vẹn của Bảng Phản Ví Dụ (Counterexample Verification C01 - C25): Có kịch bản nào bị sót gây lỗi hỏng dữ liệu, race condition hoặc mất dữ liệu lịch sử không?
2. Đánh giá tính chuẩn mực sư phạm và quy chuẩn xuất bản Excel hành chính (MOET Compliance): Định dạng 2 tầng header, các cột căn lề, font Times New Roman, dòng tổng kết và khối ký tên đã chuẩn chỉ chưa?
3. Đánh giá hiệu năng và UX: Trải nghiệm tương tác ô (0ms local latency + debounced batch save), sticky header & cột họ tên, luồng chọn cột xuất Excel.
4. Kiểm toán an toàn dữ liệu và phân quyền đa lớp: Nguy cơ rò rỉ dữ liệu giữa các lớp hoặc quyền can thiệp của người dùng.
5. KẾT LUẬN NGHIỆM THU (FINAL VERDICT): ĐẠT (APPROVED) / YÊU CẦU BỔ SUNG (REQUEST_CHANGES).

LƯU Ý QUAN TRỌNG: Hãy đảm bảo in chính xác "END OF HANDOFF" ở dòng cuối cùng của phản hồi.
`;

  try {
    const response = await sendToChatGPTWeb(auditPrompt, taskId);
    console.log('\n--- AUDIT RESPONSE RECEIVED ---\n');
    console.log(response.slice(0, 500) + '...\n');

    // Lưu vào .ai/audits/
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const auditDir = path.resolve(process.cwd(), '.ai', 'audits');
    if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });

    const auditFilePath = path.join(auditDir, `${dateStr}_AUDIT_TASK-MULTI-COLUMN-MONITOR-001_COMPREHENSIVE_AUDIT.md`);
    fs.writeFileSync(auditFilePath, response, 'utf-8');
    console.log(`✅ Audit report saved to: ${auditFilePath}`);

    const hasApproved = response.includes('APPROVED');
    const hasMarker = response.includes('END OF HANDOFF');
    console.log(`\nAudit Status: ${hasApproved ? 'APPROVED ✅' : 'CHANGES REQUESTED ⚠️'}`);
    console.log(`Handoff Marker (Invariant 22): ${hasMarker ? 'PRESENT ✅' : 'MISSING ❌'}`);
  } catch (err) {
    console.error('❌ Error during AI Loop audit:', err);
    process.exit(1);
  }
}

runAudit();
