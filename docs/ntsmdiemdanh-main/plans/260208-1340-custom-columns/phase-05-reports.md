# Phase 05: Reports Filter & Preset
Status: ⬜ Pending
Dependencies: Phase 01, Phase 06

## Objective
Thêm bộ lọc theo frequency/cột/archived và hệ thống preset báo cáo.

## Implementation Steps
1. [ ] **Cập nhật components/reports/reports-filter.tsx**
   - Checkbox group: Frequency (daily, period, one_time)
   - Checkbox group: Columns (Fixed / Custom với sub-items)
   - Checkbox: "Hiện cột đã hoàn thành (archived)"

2. [ ] **Tạo services/preset-service.ts**
   - getPresets(classId): Lấy danh sách preset
   - createPreset(preset): Lưu preset mới
   - deletePreset(id): Xóa preset
   - applyPreset(id): Load và apply preset

3. [ ] **Cập nhật app/reports/page.tsx**
   - Dropdown chọn preset
   - Nút "Lưu chế độ hiển thị" → tạo preset
   - Apply filters vào query data

4. [ ] **Thống kê theo Frequency**
   - Daily: Tổng theo ngày
   - Period: Tổng theo periodKey
   - One_time: Count done/pending

## Files to Create/Modify
- `src/components/reports/reports-filter.tsx` - Thêm filters
- `src/services/preset-service.ts` - [NEW] Preset CRUD
- `src/app/reports/page.tsx` - Integrate filters & presets

## Test Criteria
- [ ] Lọc theo frequency hoạt động
- [ ] Preset lưu và load đúng
- [ ] Thống kê đúng bản chất frequency
- [ ] Archived chỉ hiện khi tick
