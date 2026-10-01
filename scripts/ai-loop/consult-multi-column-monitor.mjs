import fs from 'node:fs';
import path from 'node:path';
import { sendToChatGPTWeb } from './bridge-client.mjs';

async function runConsultation() {
  console.log('🚀 Dispatching Architectural RFC to ChatGPT Web Luna via Bridge 17841...');
  const taskId = 'TASK-MULTI-COLUMN-ACTIVITY-MONITOR-001';

  const rfcPrompt = `
Bạn là Senior Principal Software Architect, EdTech Systems Lead & Database Architect độc lập trong hệ thống Triad-AI Development Loop Orchestrator.
Dự án là Hệ thống Quản Lý Điểm Danh & Sổ Theo Dõi Học Sinh (THCS).

YÊU CẦU NÂNG CẤP ĐẶC BIỆT TỪ NGƯỜI DÙNG:
"Lên kế hoạch nâng cấp Sổ theo dõi có chế độ MỘT LẦN NHƯNG NHIỀU CỘT:
- Giáo viên có thể gôm các hoạt động một lần trong 1 lần xuất báo cáo (hoặc 1 sổ tổng hợp).
  Ví dụ: Lập danh sách đánh dấu tham gia đăng ký hoạt động: Bảo hiểm tai nạn, Bán trú, Tham gia hội thao...
- Cho phép thêm/bớt cột sau đó, tùy chọn cột để xuất báo cáo / xuất Excel.
- Mỗi cột có thể thêm tùy chọn: 'Ghi chú kế bên tùy ý' (nếu bật thì in cột ghi chú kế bên, không thì thôi).
- Mỗi loại hoạt động lại có thể có nhiều cột con:
  + Bảo hiểm tai nạn: [Có / Không]
  + Bán trú: [Đăng ký] + [Ghi chú] (để giáo viên điền: ăn chay, ngủ riêng, dị ứng...)
  + Tham gia hội thao: [Cờ tướng] + [Cờ Vua] + [Kéo co]... (dạng checklist các môn mà học sinh đăng ký tham gia).
Yêu cầu tham vấn đúng quy trình lên Kế hoạch Master (Master Plan)."

==================================================
HIỆN TRẠNG KIẾN TRÚC HIỆN TẠI CỦA DỰ ÁN:
==================================================
1. Bảng \`columns\`:
   - \`id\`: string (vd: \`classId_custom_timestamp_hash\`)
   - \`class_id\`: string (FK classes.id)
   - \`user_id\`: string
   - \`name\`: string
   - \`frequency\`: 'daily' | 'period' | 'one_time'
   - \`period_config\`: JSONB
   - \`sub_periods\`: JSONB
   - \`suggestions\`: text[] (các gợi ý trạng thái nhanh)
   - \`applicable_scope\`: 'all' | 'subset'
   - \`payment_config\`: JSONB (VietQR)
   - \`is_shared_with_parents\`: boolean
2. Bảng \`column_records\`:
   - \`id\`: \`\${columnId}_\${studentCode}\` (đối với one_time)
   - \`column_id\`: string
   - \`class_id\`: string
   - \`student_code\`: string
   - \`record_type\`: 'daily' | 'period' | 'one_time'
   - \`status\`: 'done' | 'pending'
   - \`value\`: unknown (JSONB)
   - \`note\`: text
   - \`completed_at\`: timestamptz

==================================================
YÊU CẦU BẢN THAM VẤN CHUYÊN SÂU (ARCHITECTURAL BLUEPRINT & MASTER PLAN):
==================================================
Vui lòng phân tích và thiết kế Kế Hoạch Master chuẩn xác theo 5 trụ cột:

TRỤ CỘT 1: DATA MODEL & SCHEMA EVOLUTION (Tương thích ngược 100%)
- Nên thiết kế bảng \`columns\` và cấu hình thế nào để hỗ trợ:
  + Sổ phức hợp (Composite Activity Registry Sheet).
  + Định nghĩa cây cột (Parent Activity -> Sub-columns / Options -> Optional Notes).
  + Lưu trữ trạng thái trong \`column_records\` (cấu trúc JSONB cho trường \`value\` thế nào để query nhanh, dễ gộp báo cáo, không gây breaking changes với các cột đơn lẻ cũ).

TRỤ CỘT 2: UI/UX MA TRẬN NHẬP LIỆU (Interactive Matrix Data Grid)
- Trải nghiệm nhập liệu của Giáo viên trên màn hình lớp:
  + Bảng ma trận 2 chiều (Học sinh x Hoạt động & Cột con).
  + Multi-header table (Header cấp 1: Tên Hoạt Động; Header cấp 2: Phân loại môn / Đăng ký / Ghi chú).
  + Thao tác nhanh: Quick tick cả lớp, phím tắt điều hướng bàn phím (Arrow keys / Space to toggle), gõ ghi chú inline trực tiếp.
  + Thêm / Xóa / Ẩn / Chỉnh sửa cột con động mà không làm mất dữ liệu đã nhập.

TRỤ CỘT 3: ENGINE XUẤT BÁO CÁO & XUẤT EXCEL TỔNG HỢP (Consolidated Export Engine)
- Giao diện Chọn Cột (Column & Activity Selector):
  + Cho phép giáo viên tick chọn tập hợp các hoạt động / cột con muốn xuất.
  + Tùy chọn gom nhiều cột một lần độc lập vào chung 1 bảng tổng hợp.
- Chuẩn mẫu xuất Excel (.xlsx qua \`exceljs\`):
  + Bố cục mẫu chuẩn BGDĐT: Quốc hiệu, Tên trường, Tên lớp, Năm học, Tên bảng báo cáo.
  + Merged Header Cells chuẩn đồ họa.
  + Cột STT, Mã định danh Bộ, Họ và tên (kèm hậu tố A/B nếu có), Giới tính, Ngày sinh.
  + Các cột tích chọn hiển thị dấu 'X' hoặc '✓', cột ghi chú hiển thị nội dung tùy chỉnh.
  + Dòng Tổng kết sĩ số tham gia cho từng môn/hoạt động.
  + Khung ký tên chuẩn: Người lập bảng - Giáo viên chủ nhiệm - Ban giám hiệu.

TRỤ CỘT 4: AN NINH, QUYỀN HẠN RLS & PHÂN VÙNG NĂM HỌC
- Khóa chặt \`class_id\` và \`academic_year_id\` theo đúng các khuyến nghị từ phiên audit trước.
- RLS Policies cho Composite Records.

TRỤ CỘT 5: PHÂN RÃ KẾ HOẠCH MASTER & LỘ TRÌNH THI CÔNG (Phase-by-Phase Roadmap)
- Phân rã thành 3 Phase rõ ràng, khả thi, có tiêu chí nghiệm thu Counterexample Table (Strength = 4).
`;

  try {
    const response = await sendToChatGPTWeb(rfcPrompt, taskId);
    console.log('✅ Architectural Blueprint received from ChatGPT Web Luna!');

    const timestamp = '20261001_020500';
    const consultDir = path.join(process.cwd(), '.ai', 'consultations');
    if (!fs.existsSync(consultDir)) fs.mkdirSync(consultDir, { recursive: true });

    const consultFile = path.join(consultDir, `${timestamp}_CONSULT_${taskId}_ARCHITECTURAL_BLUEPRINT.md`);
    fs.writeFileSync(consultFile, response, 'utf8');
    console.log(`📄 Saved Consultation Blueprint to: ${consultFile}`);

    return { success: true, path: consultFile, response };
  } catch (err) {
    console.error('❌ Consultation failed:', err);
    return { success: false, error: err.message };
  }
}

runConsultation().then(res => {
  if (!res.success) {
    process.exit(1);
  }
  console.log('🎉 Consultation completed successfully.');
});
