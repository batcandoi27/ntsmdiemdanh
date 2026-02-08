# Phase 01: Codebase Audit & Setup Check
Status: ✅ Complete

## Objective
Kiểm tra tĩnh toàn bộ source code, dependencies và cấu hình môi trường để phát hiện lỗi tiềm ẩn trước khi test chức năng.

## Checklist
### Configuration
- [x] Check `.env.local` variables (Firebase keys presence verified).
- [x] Check `next.config.mjs` (Headers for Google Login Security verified).
- [x] Check `tsconfig.json` & `package.json` (Dependencies correct).

### Source Code Analysis
- [x] **Auth Provider**:
    - ⚠️ **Issue**: Trang chủ (`/`) đang được loại trừ khỏi bảo mật (`pathname !== '/'`). Dashboard chính bị lộ cho người dùng chưa đăng nhập.
    - **Fix Plan**: Remove validation skip for `/` in Phase 03.
- [x] **Database Adapters**:
    - ✅ Auto-switch logic in `db.ts` works.
    - ⚠️ **Issue**: File `page.tsx` hardcodes text "Mode: Local CSV", but app might be running in Firebase mode.
- [x] **Components**: Tailwind classes valid.
- [x] **Styles**: `suppressHydrationWarning` added to layout (Good).

## Output
- **Security Gap**: Homepage `/` needs protection.
- **UI Inconsistency**: "Mode: Local CSV" string in footer.

---
Next Phase: [Phase 02](phase-02-functional-test.md)
