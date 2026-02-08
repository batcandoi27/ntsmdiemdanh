# Phase 01: Setup & UI Structure
Status: ✅ Complete

## Objective
Thiết lập cấu trúc UI cho trang Quick Attendance để hỗ trợ 2 chế độ: "Theo Lớp" (Hiện tại) và "Theo Khối" (Mới).

## Requirements
### Functional
- [ ] Thêm Toggle/Menu để chuyển đổi giữa `CLASS_MODE` và `BLOCK_MODE`.
- [ ] `CLASS_MODE`: Giữ nguyên giao diện cũ (Chọn Khối -> Lớp -> Sheet).
- [ ] `BLOCK_MODE`:
    - [ ] Chọn Khối (6, 7, 8, 9).
    - [ ] Nút "Bắt đầu" để tải bảng dữ liệu.
    - [ ] Hiển thị bảng placeholder (Tên Lớp, Sỉ số, P, K, V...).

## Implementation Steps
1. [ ] Sửa `src/app/quick-attendance/page.tsx`:
    - Thêm state `mode`: 'CLASS' | 'BLOCK'.
    - Refactor phần "Chọn Khối/Lớp" hiện tại vào trong điều kiện `mode === 'CLASS'`.
2. [ ] Tạo UI cho `BLOCK_MODE`:
    - Copy UI chọn Khối từ mode cũ.
    - Ẩn phần chọn Lớp.
    - Thêm bảng (Table) hiển thị danh sách lớp (mock data trước).

## Files to Create/Modify
- `src/app/quick-attendance/page.tsx` - Main page logic.

## Test Criteria
- [ ] Mặc định vào `CLASS_MODE`.
- [ ] Bấm nút chuyển -> `BLOCK_MODE` -> Chỉ thấy chọn Khối, không thấy chọn Lớp.
