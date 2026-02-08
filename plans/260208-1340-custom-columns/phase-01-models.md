# Phase 01: Data Models & Column Service
Status: ⬜ Pending
Dependencies: None

## Objective
Tạo nền tảng data models và service layer cho hệ thống Custom Columns.

## Implementation Steps
1. [ ] **Cập nhật types/models.ts**
   - Thêm interface `Column` với scope, frequency, periodConfig, suggestions, archived
   - Thêm interface `DailyRecord`, `PeriodRecord`, `OneTimeRecord`
   - Thêm interface `ReportPreset`

2. [ ] **Tạo lib/defaults.ts**
   - Định nghĩa 3 fixed columns mặc định: Điểm danh, Vi phạm, Khen thưởng
   - Default suggestions cho mỗi cột

3. [ ] **Tạo services/column-service.ts**
   - getColumns(classId): Lấy tất cả columns của lớp
   - getColumn(id): Lấy một column
   - createColumn(column): Tạo mới (validate fixed không được tạo trùng)
   - updateColumn(column): Cập nhật (fixed chỉ update suggestions)
   - deleteColumn(id): Xóa (fixed không được xóa)
   - initializeFixedColumns(classId): Tạo fixed columns cho lớp mới

## Files to Create/Modify
- `src/types/models.ts` - Bổ sung Column, Record types
- `src/lib/defaults.ts` - [NEW] Fixed columns defaults
- `src/services/column-service.ts` - [NEW] Column CRUD

## Test Criteria
- [ ] Fixed columns tự động tạo khi init
- [ ] Không thể xóa fixed columns
- [ ] Column thiếu frequency sẽ bị reject
