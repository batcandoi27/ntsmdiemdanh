# Phase 01: Database Schema
Status: ⬜ Pending

## Objective
Cập nhật Schema/Cấu trúc Database hiện tại để hỗ trợ Lớp học Cá nhân.

## Requirements
### Functional
- [ ] Cập nhật bảng/collection `classes`.
- [ ] Bổ sung trường đánh dấu `isPersonal` (Boolean).
- [ ] Bổ sung trường định danh người sở hữu `ownerId` / `createdBy` (String, tương ứng User ID).

## Implementation Steps
1. [ ] Kiểm tra DB hiện tại (Firebase/Prisma/SQL).
2. [ ] Viết script migrate (nếu dùng Prisma/SQL) hoặc cập nhật interfaces TypeScript cho Firebase.
3. [ ] Đảm bảo các dữ liệu class cũ mặc định là `isPersonal: false`.

## Files to Create/Modify
- Các file schema hoặc models/types trong thư mục nguồn tương ứng.

---
Next Phase: phase-02-backend.md
