# Phase 03: Quick Selection Interaction
Status: ✅ Complete

## Objective
Xây dựng Popup/Dialog cho phép chọn nhanh học sinh để gán trạng thái (P/K/V...) từ bảng tổng hợp.

## Requirements
### Functional
- [ ] Khi click vào ô số liệu (ví dụ: ô 'Phép' của lớp 6A1):
    - [ ] Mở Popup danh sách học sinh lớp 6A1.
    - [ ] Chỉ hiển thị tên và checkbox.
    - [ ] Những học sinh đang có trạng thái 'P' sẽ được checked sẵn.
- [ ] Thao tác:
    - [ ] Check/Uncheck học sinh.
    - [ ] Bấm "Lưu" -> Cập nhật trạng thái 'P' cho học sinh đã chọn.
    - [ ] Nếu uncheck -> Xóa trạng thái 'P' (về Có mặt hoặc status cũ? Logic: Quick set status -> Overwrite).

## Implementation Steps
1. [ ] Tạo Component `StudentSelectorDialog`.
    - Props: `open`, `onClose`, `students`, `targetStatus` (P/K/V...), `onSave`.
2. [ ] Tích hợp vào Bảng:
    - Bắt sự kiện click vào cell.
    - Truyền danh sách học sinh của lớp đó vào Dialog.
3. [ ] Xử lý Save:
    - Gọi Server Action để update DB.
    - Refresh UI.

## Test Criteria
- [ ] Click ô Phép -> Hiện Dialog.
- [ ] Chọn A, B -> Lưu.
- [ ] Số liệu Phép của lớp tăng lên 2.
