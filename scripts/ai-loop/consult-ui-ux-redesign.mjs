import fs from 'node:fs';
import path from 'node:path';
import { sendToChatGPTWeb, checkBridgeHealth } from './bridge-client.mjs';

async function main() {
    console.log('======================================================================');
    console.log('  TRIAD-AI UI/UX ARCHITECTURE CONSULTATION: LIGHT THEME & PORTAL REDESIGN');
    console.log('======================================================================\n');

    const health = await checkBridgeHealth();
    console.log(`[Bridge Status] Health: ${health.ok ? 'ONLINE ✅' : 'OFFLINE ❌'}`);

    const prompt = `
BẠN LÀ SENIOR ENTERPRISE UI/UX ARCHITECT CỦA DỰ ÁN TRƯỜNG HỌC THCS TRẦN BỘI CƠ.
Yêu cầu mới từ người dùng:
1. Đồng bộ 100% về Design System chuẩn SÁNG (Light Theme - bg-slate-50, cards bg-white, text-slate-900, border-slate-200, modern color badges). Toàn bộ các trang vừa làm (Sổ Báo Bài, Thời Khóa Biểu, Modals) phải chuyển sang Light Theme sắc nét, không để nền tối slate-950 rời rạc.
2. Tối ưu trải nghiệm PC View cho Sổ Báo Bài:
   - Trên màn hình máy tính (Desktop/Laptop >= 1024px): Hỗ trợ Chế độ Bảng Tổng Hợp Chi Tiết (Full Table View) với các cột Tiết, Môn Học, BTVN, Dụng Cụ/Lưu Ý, Cảnh Báo Kiểm Tra 15p, và Checkbox "Đã hoàn thành" để học sinh tích vào khi làm xong bài.
   - Hỗ trợ Chế độ Thẻ (Grid Cards View) responsive cho mobile/tablet.
3. Cổng Học Sinh (/student & /student/homework):
   - Đăng nhập vào Cổng Học Sinh (/student) là thấy ngay Khối Sổ Báo Bài & Lịch Học Hôm Nay nổi bật ngay dưới Banner.
   - Trang riêng /student/homework có bộ chọn ngày thông minh (Hôm qua, Hôm nay, Ngày mai), bộ lọc môn học, và nút 1-chạm Ghi Báo Bài dành cho Ban Cán Sự (BCS).
4. Cổng Phụ Huynh (/portal):
   - Đăng nhập vào Cổng Phụ Huynh (/portal) tích hợp sẵn 2 Tab nội tuyến trực tiếp:
     + Tab "📖 Sổ Báo Bài & Dặn Dò": Xem bài tập và dặn dò theo từng ngày của lớp con.
     + Tab "📅 Thời Khóa Biểu": Xem lưới lịch học 6 ngày trong tuần (Thứ 2 - Thứ 7) Sáng/Chiều kèm phòng học và GV bộ môn.

HÃY THẨM ĐỊNH VÀ GỢI Ý BỐ TRÍ UI/UX CHUẨN XÁC:
1. Bố cục phân tầng layout (Hierarchy & Grid System).
2. Thiết kế tokens màu sắc cho từng môn học (Subject Color Palette).
3. Trải nghiệm Zero-Touch cho Ban Cán Sự ghi bài và Phụ Huynh tra cứu.
4. Phán quyết GO-AHEAD triển khai.
`;

    console.log('📤 Đang gửi bản đề xuất UI/UX sang ChatGPT Web Bridge để thẩm định...');
    const response = await sendToChatGPTWeb(prompt, 'TASK-UI-UX-LIGHT-THEME-REDESIGN');
    console.log(`[+] Phản hồi nhận được (${response.length} ký tự).\n`);

    const outputDir = path.join(process.cwd(), '.ai', 'consultations');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const mdFile = path.join(outputDir, 'UI_UX_LIGHT_THEME_REDESIGN_APPROVAL.md');
    fs.writeFileSync(mdFile, response, 'utf-8');
    console.log(`📄 Đã lưu thẩm định UI/UX tại: ${mdFile}`);
}

main().catch(err => {
    console.error('Lỗi tham vấn UI/UX:', err);
    process.exit(1);
});
