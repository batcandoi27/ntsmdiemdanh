# Phase 02: Backend API
Status: ⬜ Pending

## Objective
Viết API/Server function phục vụ cho Lớp học cá nhân và Import chuẩn.

## Requirements
### Functional
- [ ] API Tạo lớp học cá nhân nhanh (lưu vào database kèm context userId hiện tại).
- [ ] API/Hook Lấy danh sách lớp: Tách làm 2 hàm `fetchSchoolClasses` và `fetchPersonalClasses`.
- [ ] Chức năng Import/Export: Cung cấp file mẫu định dạng XLSX hoặc CSV chứa 5 học sinh demo (ví dụ định dạng chuẩn).

## Implementation Steps
1. [ ] Sửa đổi hàm lấy Class danh sách từ DB để nhận params `isPersonal`.
2. [ ] Tạo file Excel tĩnh hoặc đoạn code generate nhanh file Excel mẫu 5 học sinh (Tên, Mã Số, SĐT, ...).
3. [ ] Cấu hình bảo mật để Role Giáo Viên chỉ gọi xuất danh sách Lớp Của Mình.

## Files to Create/Modify
- Service của mảng `classes`.
- Tiện ích `export-utils` để đổ Excel mẫu.

---
Next Phase: phase-03-frontend.md
