# Phase 03: Attendance UI (Grouping)
Status: ⬜ Pending
Dependencies: Phase 01, Phase 06

## Objective
Phân nhóm hiển thị Fixed/Custom columns trong trang điểm danh. Chỉ render columns daily.

## Implementation Steps
1. [ ] **Cập nhật app/attendance/page.tsx**
   - Fetch columns với frequency="daily" cho lớp
   - Phân nhóm: fixed vs custom
   - Render section headers: "Cột Cố Định" / "Cột Tuỳ Chỉnh"

2. [ ] **Cập nhật components/attendance-sheet.tsx**
   - Nhận columns prop thay vì hardcode
   - Render dynamic columns từ config
   - Xử lý suggestions dropdown cho mỗi column

3. [ ] **Thêm Column Toggle**
   - Nút 👁️ để bật/tắt visibility của từng column
   - Lưu preset visibility cho lớp (localStorage hoặc Firestore)

4. [ ] **Cập nhật app/quick-attendance/page.tsx**
   - Tương tự attendance page
   - Mobile-optimized layout

## Files to Create/Modify
- `src/app/attendance/page.tsx` - Fetch columns, render groups
- `src/app/quick-attendance/page.tsx` - Tương tự
- `src/components/attendance-sheet.tsx` - Dynamic column render
- `src/components/column-toggle.tsx` - [NEW] Toggle visibility

## Test Criteria
- [ ] Chỉ hiện columns daily
- [ ] Phân nhóm rõ ràng Fixed/Custom
- [ ] Toggle visibility hoạt động
- [ ] Period/One_time KHÔNG hiển thị
