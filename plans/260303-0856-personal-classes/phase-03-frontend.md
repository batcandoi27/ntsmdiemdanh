# Phase 03: Frontend UI
Status: ⬜ Pending

## Objective
Xây dựng giao diện Danh sách Lớp Của Tôi và cập nhật mượt mà UI hiện tại, 100% tuân thủ giao diện Mobile.

## Requirements
### Functional
- [ ] Sidebar: Phân khu "Trường Học" và "Lớp Của Tôi" rõ ràng. Menu mobile vẫn hoạt động bình thường.
- [ ] Pages: Thêm route `/my-classes` hiển thị dạng ds lớp như cũ.
- [ ] Cụm chức năng Tạo Lớp: Tích hợp nút "Tạo lớp nhanh" ở góc màn hình.
- [ ] Import Excel: Tại tab nhập học sinh, gắn một nút "Tải File Excel Mẫu (5 Học Sinh)".
- [ ] Đảm bảo CSS classes không phá vỡ UI tổng của version trước.

## Implementation Steps
1. [ ] Sửa component Sidebar hiện hành (cẩn thận logic điều hướng route).
2. [ ] Tạo UI cho page `/my-classes`. Tận dụng Component Card/List có sẵn.
3. [ ] Chèn form modal thêm Lớp nhanh.
4. [ ] Chỉnh UI trang import.
5. [ ] Mở Responsive layout ở Chrome dev tool để soát.

## Files to Create/Modify
- `src/components/.../Sidebar`
- `src/app/my-classes/page`
- Trang Import Excel.

---
Next Phase: phase-04-integration.md
