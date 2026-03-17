# 🚀 Future Roadmap: Killer Features & Smart Import

## 1. Nâng Cấp Import (Smart Data Import) - Ưu Tiên Triển Khai Ngay
Để giải quyết triệt để vấn đề "Import thiếu" và "Mù thông tin", hệ thống sẽ được nâng cấp quy trình Import 3 bước:
- **Bước 1: Parse & Validate (Client-side)**
    - Đọc file Excel ngay trên trình duyệt.
    - Hiển thị trước (Preview): "Tìm thấy 20 lớp, 850 học sinh".
    - Cảnh báo dữ liệu lỗi (Thiếu mã, sai ngày sinh...).
- **Bước 2: Batch Upload (Có Progress Bar)**
    - Chia nhỏ dữ liệu thành các gói tin (Batch).
    - Hiển thị thanh tiến trình: "Đang nhập lớp 6A1... (50%)".
    - Log chi tiết: "✅ Đã lưu 40HS lớp 6A1".
- **Bước 3: Xác Nhận & Báo Cáo**
    - Thông báo kết quả cuối cùng chính xác.
- [x] Hiển thị tên học sinh + STT trong ô báo cáo (Quick Attendance)
- [x] Đồng bộ màu sắc Khối (6=Lục, 7=Lam, 8=Cam, 9=Tím)
- [x] Thêm cột 'Vắng' (Tổng hợp P+K+V)
- [x] Hiển thị đủ 5 cột trạng thái (P, K, V, T, VP)
- [x] Danh sách học sinh hiển thị 1 dòng (STT + Tên)
- [x] Popup nhập lý do Vi Phạm (VP/T) & Hiển thị icon '!'

## 2. Các Tính Năng "Killer" (Đề Xuất)
Để biến App Điểm Danh thành "Super App" cho trường học:

### 🌟 A. Auto Notification (Zalo/SMS Integrator)
- **Tính năng**: Ngay khi GVCN tích vào "Vắng (K)", hệ thống tự động bắn tin nhắn Zalo cho Phụ huynh.
- **Giá trị**: Tăng tính tương tác nhà trường - gia đình, giảm thiểu trốn học.

### 🌟 B. FaceID / QR Check-in
- **Tính năng**: Học sinh quét thẻ QR hoặc nhận diện khuôn mặt tại cổng trường/cửa lớp.
- **Giá trị**: Tự động hóa 100%, GVCN không cần điểm danh tay.

### 🌟 C. Real-time Headmaster Dashboard
- **Tính năng**: Hiệu trưởng xem biểu đồ nhảy số theo thời gian thực (Sáng nay vắng bao nhiêu em toàn trường?).
- **Giá trị**: Quản lý vĩ mô chính xác tức thì.

### 🌟 D. Sổ Đầu Bài Điện Tử (Digital Class Log)
- **Tính năng**: Chấm điểm thi đua, ghi nhận xét tiết học ngay trên App.
- **Giá trị**: Thay thế sổ giấy truyền thống, tự động tính điểm thi đua tuần/tháng.

### 🌟 E. Teacher Substitution (Quản Lý Dạy Thay)
- **Tính năng**: Tự động đề xuất giáo viên trống tiết để dạy thay khi có người nghỉ.
- **Giá trị**: Giải phóng tổ chuyên môn khỏi việc xếp lịch thủ công.

## 3. Lộ Trình Triển Khai
- **Tuần 1**: Hoàn thiện Smart Import (Done Import logic).
- **Tuần 2-3**: Auto Notification & Sổ Đầu Bài.
- **Tuần 4**: Real-time Dashboard & Mobile App.
