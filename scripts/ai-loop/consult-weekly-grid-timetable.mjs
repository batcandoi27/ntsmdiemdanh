import { sendToChatGPTWeb } from "./bridge-client.mjs";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Bắt đầu gửi yêu cầu tham vấn kiến trúc sang ChatGPT Web qua Bridge 17841...");

  const prompt = `Bạn là Senior Product Architect & UX Specialist trong Hệ thống Điểm Danh & Sổ Chủ Nhiệm THCS Trần Bội Cơ.
Nhiệm vụ: Tham vấn hoàn thiện kiến trúc và UX/UI cho tính năng "QUẢN LÝ THỜI KHÓA BIỂU CẢ TUẦN DẠNG 1 BẢNG GRID LƯỚI ZERO-TOUCH 1-CHẠM".

BỐI CẢNH VÀ YÊU CẦU:
1. Hiện tại giao diện thời khóa biểu bị chia làm từng tab ngày (Thứ 2 -> Thứ 7), mỗi ngày là danh sách dọc gây bất tiện khi theo dõi tổng thể lịch học của lớp.
2. Người dùng yêu cầu:
   - Toàn bộ thời khóa biểu cả tuần (Thứ Hai -> Thứ Bảy) phải hiển thị gọn gàng, trực quan trong 1 BẢNG GRID LƯỚI DUY NHẤT.
   - Bấm chọn vào bất kỳ ô nào (ví dụ: Thứ 2 Tiết 1) sẽ xuất hiện nhanh chóng Dropdown / Popover gợi ý môn học với màu sắc, icon badge sinh động.
   - Danh sách môn học trong gợi ý BẮT BUỘC ĐỒNG BỘ TRỰC TIẾP từ cấu hình "Quản lý Danh mục Môn học" trong http://localhost:8888/settings (tự động nhận diện Khối lớp để lấy danh sách Tiểu Học / THCS / THPT tương ứng, cộng với các môn mặc định: Chào Cờ, Sinh Hoạt Lớp, Hoạt động TNST, Nghỉ).
   - Zero-Touch 1-chạm: Bấm vào môn học là điền ngay vào ô đó.
   - Hỗ trợ điền nhanh Giáo viên (GV), Phòng học, và các tiện ích: Tự động điền Chào Cờ (T2-T1) & Sinh Hoạt Lớp (T7-T5), Xóa ô, Sao chép ngày, In TKB.

YÊU CẦU PHẢN HỒI:
Hãy đưa ra bản thiết kế kiến trúc và khuyến nghị UX chi tiết gồm:
1. Kiến trúc Bảng Grid Tuần (Layout, Responsive, Tối ưu không gian hiển thị Buổi Sáng & Buổi Chiều, Fixed Header/Sticky Column).
2. Thiết kế Popover / Dropdown Môn học Zero-Touch (Vị trí anchor, Palette nhóm môn, Tìm kiếm nhanh, Phím tắt, Cập nhật 1-chạm).
3. Cơ chế đồng bộ dữ liệu Realtime với Settings (Cache local storage, dispatch event, fallback an toàn khi mất mạng hoặc chưa cấu hình).
4. Bộ tiện ích gia tăng (Delighters: Quick shortcuts, Fast fill templates, Batch copy, Print layout).
5. Checklist kiểm thử thực nghiệm (Counterexample cases, Error handling).`;

  try {
    const response = await sendToChatGPTWeb(prompt, "TASK-WEEKLY-GRID-TIMETABLE");
    console.log("✅ Đã nhận phản hồi thành công từ ChatGPT Web!");

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    
    const consultDir = path.resolve(process.cwd(), ".ai/consultations");
    if (!fs.existsSync(consultDir)) {
      fs.mkdirSync(consultDir, { recursive: true });
    }

    const filename = `${timestamp}_CONSULT_TASK-WEEKLY-GRID-TIMETABLE_CHATGPT.md`;
    const fullPath = path.join(consultDir, filename);

    const artifactContent = `---
type: consultation
task_id: TASK-WEEKLY-GRID-TIMETABLE
created_at: ${now.toISOString()}
model: chatgpt-web/luna
bridge_endpoint: http://127.0.0.1:17841/v1/responses
---

# BẢN THAM VẤN KIẾN TRÚC & UX: BẢNG GRID THỜI KHÓA BIỂU CẢ TUẦN ZERO-TOUCH

${response}
`;

    fs.writeFileSync(fullPath, artifactContent, "utf8");
    console.log(`📄 Đã lưu minh chứng tham vấn tại: ${fullPath}`);
    console.log("\n=== TÓM TẮT PHẢN HỒI TỪ CHATGPT WEB ===");
    console.log(response.slice(0, 1000) + (response.length > 1000 ? "\n... [Xem đầy đủ trong file]" : ""));
  } catch (err) {
    console.error("❌ Lỗi khi tham vấn ChatGPT Web:", err.message);
    process.exit(1);
  }
}

main();
