# 🧪 Hướng Dẫn Kiểm Thử (Manual Test Guide)
**Tính năng**: Quản Lý Lớp Học & Học Sinh (Class Management System)
**Ngày tạo**: 01/02/2026

## 1. Mục đích
Đảm bảo tính năng Quản lý Lớp hoạt động ổn định, dữ liệu được lưu trữ chính xác và giao diện người dùng thân thiện.

## 2. Các Trường Hợp Kiểm Thử (Test Cases)

### A. Quy trình Reset & Import (Quan trọng)
| STT | Hành động | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| A1 | Vào trang `/import`. Nhấn nút **"Xóa Dữ Liệu Cũ"**. | Hiện cảnh báo xác nhận. Sau khi OK, thông báo "Thành công". | ⬜ |
| A2 | Vào trang `/classes` kiểm tra. | Danh sách trống (Hiện thông báo "Chưa có lớp học nào"). | ⬜ |
| A3 | Quay lại `/import`, upload file Excel mẫu. | Import thành công. Hiện Stats (số lớp, số HS). Nút **"Tới Quản Lý Lớp"** hiện ra. | ⬜ |

### B. Quản lý Lớp Học (`/classes`)
| STT | Hành động | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| B1 | Xem danh sách lớp. | Hiển thị đủ 54 lớp (nếu file import chuẩn). Thứ tự sắp xếp đúng (Khối 6 -> 9). | ⬜ |
| B2 | Nhấn **"Thêm Lớp Mới"**. Nhập: `9Z9`. | Modal đóng. Lớp `9Z9` hiện ngay lập tức trên danh sách. | ⬜ |
| B3 | Sửa lớp `9Z9`. Đổi tên thành `9Z-Premium`. | Tên lớp cập nhật ngay lập tức. | ⬜ |
| B4 | Xóa lớp `9Z-Premium`. | Hiện popup xác nhận. Sau khi OK, lớp biến mất khỏi danh sách. | ⬜ |

### C. Quản lý Học Sinh (`/classes/[id]`)
| STT | Hành động | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| C1 | Chọn một lớp bất kỳ (VD: 6A1). | Vào màn hình chi tiết. Thấy danh sách học sinh. | ⬜ |
| C2 | Tìm kiếm tên "An". | Danh sách lọc ra những học sinh có tên "An". | ⬜ |
| C3 | Nhấn **"Thêm Học Sinh"**. Nhập `Nguyễn Văn Test`. | Học sinh mới hiện ở cuối danh sách. STT và Mã HS tự động (nếu có logic auto) hoặc theo nhập liệu. | ⬜ |
| C4 | Sửa học sinh này. Đổi trạng thái -> `Nghỉ học`. | Tag trạng thái chuyển sang màu Đỏ. | ⬜ |
| C5 | Xóa học sinh test. | Học sinh biến mất khỏi danh sách. | ⬜ |

## 3. Ghi chú lỗi (Nếu có)
Nếu gặp lỗi, vui lòng chụp màn hình hoặc copy dòng thông báo lỗi (màu đỏ) ở góc màn hình.

---
**Xác nhận bởi**: ____________________
