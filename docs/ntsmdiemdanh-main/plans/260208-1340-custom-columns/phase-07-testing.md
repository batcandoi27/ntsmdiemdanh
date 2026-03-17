# Phase 07: Testing & Migration
Status: ⬜ Pending
Dependencies: Phase 01-06

## Objective
Test toàn bộ hệ thống, migration dữ liệu cũ, đảm bảo không break core feature.

## Implementation Steps
1. [ ] **Migration Script**
   - Tạo script migrate existing AttendanceRecord → Column + Records
   - Điểm danh cũ → Column "Điểm danh" + DailyRecords
   - Vi phạm cũ (notes field) → Column "Vi phạm" + DailyRecords
   - Backup trước khi migrate

2. [ ] **Regression Test**
   - Điểm danh cơ bản vẫn hoạt động
   - Quick attendance mobile OK
   - Reports không lỗi với data mới
   - Export Excel hoạt động

3. [ ] **Edge Cases**
   - Lớp không có custom columns
   - Period column hết hạn giữa chừng
   - One_time với học sinh mới thêm

4. [ ] **Performance Check**
   - Load time với nhiều columns
   - Query optimization cho reports

## Files to Create/Modify
- `scripts/migrate-attendance.ts` - [NEW] Migration script
- Manual test checklist

## Test Criteria
- [ ] Dữ liệu cũ không mất
- [ ] Core điểm danh hoạt động bình thường
- [ ] Không crash với edge cases
- [ ] Performance acceptable
