# Phase 02: Settings UI (Tabs)
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Thêm giao diện quản lý columns trong /settings với 2 tabs: Fixed và Custom.

## Implementation Steps
1. [ ] **Cập nhật app/settings/page.tsx**
   - Thêm Tabs component (Fixed / Custom)
   - Import và render 2 tab components

2. [ ] **Tạo components/settings/fixed-columns-tab.tsx**
   - Hiển thị 3 fixed columns (read-only name)
   - Cho phép chỉnh sửa suggestions
   - Nút Save suggestions

3. [ ] **Tạo components/settings/custom-columns-tab.tsx**
   - Danh sách custom columns
   - Nút thêm mới → mở Modal wizard
   - Wizard: Nhập tên → Chọn frequency → Nếu period: nhập start/end date
   - CRUD actions: Edit, Delete

## Files to Create/Modify
- `src/app/settings/page.tsx` - Thêm tabs layout
- `src/components/settings/fixed-columns-tab.tsx` - [NEW]
- `src/components/settings/custom-columns-tab.tsx` - [NEW]
- `src/components/settings/column-wizard-modal.tsx` - [NEW]

## Test Criteria
- [ ] Fixed tab không cho xóa/thêm columns
- [ ] Custom tab bắt buộc chọn frequency
- [ ] Period columns phải có start/end date
