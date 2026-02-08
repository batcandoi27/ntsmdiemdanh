# Phase 02: Git Init & Commit
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Khởi tạo Git repository và tạo commit đầu tiên an toàn.

## Implementation Steps
1. [ ] **Git Init**
   - Chạy `git init` nếu chưa có `.git`.

2. [ ] **Review Staged Files**
   - Chạy `git add .`
   - Sử dụng `git status` để review **kỹ** danh sách file sẽ commit.
   - Đảm bảo không có folder `node_modules` hay file `.env`.

3. [ ] **Commit**
   - Chạy `git commit -m "Initial commit for ntsmdiemdanh"`
   - Kiểm tra lại lịch sử commit.

## Verification
- `git log` hiển thị 1 commit.
- `git ls-files` không chứa file nhạy cảm.
