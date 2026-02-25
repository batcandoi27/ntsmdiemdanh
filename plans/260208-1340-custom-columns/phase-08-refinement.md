# Phase 08: Refinement & Feedback Integration
Status: ⬜ Pending
Dependencies: Phase 01-07

## Objective
Hoàn thiện tính năng theo feedback của người dùng: Thêm "Khen thưởng" vào Quick Attendance, Cải thiện menu chọn lớp, Thay đổi Header, và Bổ sung bộ lọc báo cáo.

## Implementation Steps

### 1. Header & Navigation
- [ ] **Thay đổi Header**: Thay nút "Nhập Liệu" thành "Cài Đặt" (icon Settings) trong `src/components/layout/site-header.tsx`.
- [ ] **Teacher Classes**: Trong Settings -> Dữ liệu, thêm phần "Lớp của tôi" để giáo viên chọn các lớp mình phụ trách (lưu vào localStorage hoặc User preferences).

### 2. Quick Attendance (Mobile)
- [ ] **Menu Chọn Lớp**: Thêm Drawer/Menu để chọn nhanh lớp (filter theo "Lớp của tôi" nếu có).
- [ ] **Cột Khen Thưởng**: Cập nhật `MobileAttendanceList` và `MobileClassDetail` để hiển thị và cho phép điểm danh cột Khen thưởng (Reward).
- [ ] **Logic**: Map cột Khen thưởng vào action bar (bên cạnh Vi phạm).

### 3. Settings - Fixed Columns Visibility
- [ ] **Toggle Visibility**: Trong tab "Cột cố định", thêm switch để ẩn/hiện cột (VD: ẩn cột Khen thưởng nếu không dùng).
- [ ] **Lưu Config**: Lưu cấu hình visibility vào `ColumnVisibilityPreset`.

### 4. Reports - Column Filter
- [ ] **Filter UI**: Cập nhật `ReportsFilter` để thêm dropdown chọn Columns (Fixed & Custom).
- [ ] **Logic Apply**: Filter kết quả báo cáo theo columns đã chọn.

## Files to Modify
- `src/components/layout/site-header.tsx`
- `src/app/quick-attendance/page.tsx`
- `src/components/quick-attendance/mobile-attendance-list.tsx`
- `src/components/quick-attendance/mobile-class-detail.tsx`
- `src/components/settings/fixed-columns-tab.tsx`
- `src/components/reports/reports-filter.tsx`
- `src/app/reports/page.tsx`

## Test Criteria
- [ ] Header hiện nút Cài Đặt
- [ ] Quick Attendance có cột Khen thưởng
- [ ] Quick Attendance có menu chọn lớp tiện lợi
- [ ] Reports lọc được theo cột
