# Phase 04: Integration & Testing
Status: ⬜ Pending

## Objective
Kết nối API với giao diện, Test 1 vòng End-to-End trải nghiệm người dùng.

## Requirements
### Functional
- [ ] Liên kết form Tạo Lớp với API, sau khi tạo UI sẽ reload ngay báo hiệu thành công.
- [ ] Kiểm tra import dữ liệu từ File Excel mẫu có vào list lớp cá nhân đúng không.
- [ ] Admin / Giáo viên không thấy lớp cá nhân của giáo viên khác.
- [ ] Dùng công cụ Mobile Simulator kiểm tra vỡ Layout, Check thao tác ngón tay chạm màn hình.

## Implementation Steps
1. [ ] Gắn Hooks/Data fetching vào UI Component.
2. [ ] Xử lý loading spinner, Toast message (thông báo).
3. [ ] Login = tài khoản A tạo lớp. Login = tài khoản B kiểm tra độ hiển thị.

## Test Criteria
- [ ] Flow: Thêm lớp -> Tải file Excel mẫu -> Sửa File Excel -> Upload lại => Hệ thống nhận đủ.
- [ ] Không lỗi undefined, 500 khi chuyển tab Lớp Trường <-> Lớp Riêng.
- [ ] UI Mobile đẹp nguyên bản.

---
Next Phase: Hoàn thành!
