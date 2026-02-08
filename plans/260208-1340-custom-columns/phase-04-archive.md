# Phase 04: Auto Archive Logic
Status: ⬜ Pending
Dependencies: Phase 01, Phase 06

## Objective
Tự động archive columns khi hoàn thành (one_time) hoặc hết hạn (period).

## Implementation Steps
1. [ ] **Tạo lib/archive-checker.ts**
   - checkOneTimeComplete(columnId, classId): Kiểm tra 100% học sinh done
   - checkPeriodExpired(column): Kiểm tra currentDate > endDate

2. [ ] **Cập nhật services/column-service.ts**
   - archiveColumn(id): Set archived = true
   - unarchiveColumn(id): Set archived = false (cho period mới)
   - autoArchiveCheck(): Chạy kiểm tra và archive

3. [ ] **UI cho Archive**
   - Archived columns ẩn khỏi danh sách nhập liệu
   - Nút "Mở kỳ mới" để clone column period với date mới
   - Settings hiển thị archived columns với badge

## Files to Create/Modify
- `src/lib/archive-checker.ts` - [NEW] Archive logic
- `src/services/column-service.ts` - Thêm archive methods

## Test Criteria
- [ ] One_time auto archive khi 100% done
- [ ] Period auto archive khi hết hạn
- [ ] Archived không hiện trong attendance
- [ ] Clone period tạo column mới đúng cách
