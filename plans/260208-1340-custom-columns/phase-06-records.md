# Phase 06: Record Services
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Refactor service layer để lưu/đọc records theo frequency (Daily, Period, OneTime).

## Implementation Steps
1. [ ] **Tạo services/record-service.ts**
   - saveDailyRecord(record): Lưu record daily (key = date)
   - savePeriodRecord(record): Lưu record period (key = periodKey)
   - saveOneTimeRecord(record): Lưu record one_time (key = studentId)
   - getRecords(columnId, filters): Query records theo điều kiện

2. [ ] **Cập nhật firebase-adapter.ts**
   - Thêm path: columnData/{columnId}/records/{recordKey}
   - Batch write cho multi-student updates

3. [ ] **Validate Frequency**
   - Không cho lưu daily record vào one_time column
   - Type-safe với generics

## Files to Create/Modify
- `src/services/record-service.ts` - [NEW] Record CRUD
- `src/services/firebase-adapter.ts` - Thêm columnData paths

## Test Criteria
- [ ] Daily record lưu đúng với key = date
- [ ] Period record lưu đúng với key = periodKey
- [ ] OneTime record lưu đúng với key = studentId
- [ ] Validate frequency mismatch throw error
