# Spec: Lớp Của Tôi (Personal Classes)

## 1. Executive Summary
Tính năng cho phép người dùng tự tạo lớp học cá nhân. Lớp này chỉ hiển thị với người tạo ra nó và Admin. 
Tận dụng lại toàn bộ các tính năng hiện có (điểm danh, thống kê, báo cáo) nhưng với không gian dữ liệu tách biệt.

## 2. User Stories
- Là giáo viên, tôi muốn tạo nhanh một lớp học của riêng mình để quản lý học sinh học thêm.
- Là giáo viên, tôi muốn import danh sách học sinh từ file Excel (có mẫu sẵn 5 học sinh) để tiết kiệm thời gian.
- Là giáo viên, tôi muốn điểm danh, xem báo cáo cho lớp cá nhân nhưng không ảnh hưởng đến dữ liệu trường.
- Là giáo viên, tôi chỉ muốn thấy lớp của tôi trong link cá nhân, và lớp của trường trong link chung.
- Là giáo viên, tôi muốn giao diện trên mobile hiển thị gọn gàng, không bị vỡ layout, kế thừa từ UI đang có.

## 3. Database Design
- Bảng `Class` (hoặc collection tùy DB):
  - Thêm `isPersonal` (Boolean, default: false)
  - Thêm `ownerId` hoặc `createdBy` (String/Relation tới User)

## 4. Logic Flowchart
- **Sidebar chia nhánh**: Lớp Chung (Trường) & Lớp Của Tôi.
- **Tạo lớp**: Modal đơn giản chỉ nhập Tên Lớp -> Gọi API lưu với `isPersonal=true`, ghi nhận `ownerId`.
- **Trang My Classes**: Lọc class theo `isPersonal=true` && `ownerId=currentUser`.
- **Import Excel**: Cung cấp tùy chọn tải file mẫu (có sẵn 5 dữ liệu ảo). Import xử lý add học sinh vào class như cũ.

## 5. UI Components
- **Sidebar**: Tách Sidebar Menu hiện tại thành 2 khu vực rõ ràng.
- **My Classes Page (`/my-classes`)**: Tiêu đề trang, nút Thêm lớp nhanh và danh sách Class Cards (giống trang lớp học hiện tại).
- **Import/Export Excel View**: Sửa lại UI Import để bổ sung Banner/Button nhắc tải file Mẫu chuẩn bị sẵn.

## 6. Mobile Requirements
- **Sidebar**: Toggle mượt mà trên Mobile qua Hamburger button.
- **Bảng/Danh Sách Học Sinh**: Hiển thị linh hoạt, phần list có dải cuộn ngang (`overflow-x-auto`) nếu vượt quá chiều ngang.
- **Form**: Các input box full width (`w-full`) trên mobile, padding vừa tay người dùng bấm (Touch target).
