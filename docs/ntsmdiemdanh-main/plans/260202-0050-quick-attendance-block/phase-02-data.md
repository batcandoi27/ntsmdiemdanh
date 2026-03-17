# Phase 02: Data Fetching (Block Mode)
Status: ✅ Complete

## Objective
Lấy dữ liệu điểm danh tổng hợp của toàn bộ khối để hiển thị lên bảng.

## Requirements
### Functional
- [ ] Server Action `getGradeAttendanceSummary(grade, date)` trả về:
    - Danh sách các lớp trong khối.
    - Sỉ số mỗi lớp.
    - Số lượng P, K, V, T, VP hiện tại của lớp đó trong ngày.
    - Danh sách chi tiết học sinh (để dùng cho popup sau này).

## Implementation Steps
1. [ ] Tạo file `src/app/actions/quick-attendance.ts`.
2. [ ] Viết hàm `getGradeAttendanceSummary`.
    - Query `Class` model lấy danh sách lớp theo `grade`.
    - Query `Attendance` model theo `date` và danh sách `classId`.
    - Aggregation: Đếm số lượng theo status cho từng lớp.
3. [ ] Tích hợp vào `page.tsx`:
    - Gọi API khi bấm "Bắt đầu" ở Block Mode.
    - Hiển thị dữ liệu thật lên bảng.

## Files to Create/Modify
- `src/app/actions/quick-attendance.ts` - New server actions.
- `src/app/quick-attendance/page.tsx` - Fetch & Display data.

## Test Criteria
- [ ] Chọn Khối 6 -> Bảng hiện danh sách các lớp 6A1, 6A2...
- [ ] Các cột P, K, V hiện số liệu đúng (0 nếu chưa điểm danh).
