# Phase 01: Security Audit & Setup
Status: ⬜ Pending

## Objective
Đảm bảo **tuyệt đối không** lộ thông tin nhạy cảm khi upload. Tạo `.gitignore` chuẩn.

## Implementation Steps
1. [ ] **Tạo/Cập nhật .gitignore**
   - Loại bỏ: `node_modules`, `.next`, `.env`, `.env.local`, `.DS_Store`
   - Loại bỏ file data: `*.xlsx`, `*.csv` (trừ template mẫu nếu cần)
   - Loại bỏ logs/temp files.

2. [ ] **Scan Secrets**
   - Tìm kiếm các từ khóa: `key`, `secret`, `password`, `token` trong code.
   - Kiểm tra hardcoded credentials.

3. [ ] **Clean Data**
   - Di chuyển file dữ liệu nhạy cảm ra khỏi thư mục source (hoặc đảm bảo đã ingore).

## Files to Modify
- `.gitignore` (mới/cập nhật)

## Verification
- Chạy `git status` để đảm bảo các file bị ignore không hiện ra.
- Kiểm tra thủ công các file config.
