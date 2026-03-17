# Phase 03: Push & Verify
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Đẩy code lên GitHub và kiểm tra kết quả.

## Implementation Steps
1. [ ] **Add Remote**
   - Chạy `git remote add origin https://github.com/batcandoi27/ntsmdiemdanh.git`
   - Nếu remote đã tồn tại, kiểm tra lại URL: `git remote -v`

2. [ ] **Push Code**
   - Chạy `git branch -M main` (đổi tên nhánh chính thành main).
   - Chạy `git push -u origin main`.

3. [ ] **Verify on GitHub**
   - User truy cập link repo: `https://github.com/batcandoi27/ntsmdiemdanh`
   - Kiểm tra tab "Code" để đảm bảo file `.env` không xuất hiện.
   - Kiểm tra tab "Commits" để đảm bảo không có lịch sử nhạy cảm.
