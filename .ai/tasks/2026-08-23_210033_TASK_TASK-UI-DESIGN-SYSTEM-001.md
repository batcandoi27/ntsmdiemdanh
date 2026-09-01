# TASK-UI-DESIGN-SYSTEM-001: Kiến Trúc Hệ Thống Design System Toàn Diện & Nâng Cấp UI/UX Toàn Bộ Ứng Dụng (Mobile & PC)

- **Trạng thái:** `COMPLETED` ✅
- **Người thực hiện:** Antigravity (Gemini 3.7 Flash)
- **Reviewer:** ChatGPT Web Luna (OpenAI Independent Senior Architect)
- **Nhánh:** `feature/ui-ux-enhancements`
- **Tiêu chuẩn:** Production-Ready Design System (17 Giai đoạn)

---

## 1. MỤC TIÊU & BỐI CẢNH (OBJECTIVES)
Nâng cấp toàn bộ giao diện WebUI của hệ thống điểm danh và quản lý giáo dục lên tiêu chuẩn **Production-Ready Design System**, thống nhất trải nghiệm tối ưu trên cả thiết bị Di động (Mobile) và Máy tính (PC/Desktop):
1. Giải quyết triệt để vấn đề "hòa lẫn nền" (input, dropdown, section và card cùng màu trắng/xám phẳng, thiếu phân cấp thị giác).
2. Xóa bỏ hoàn toàn tình trạng màu sắc, font chữ, spacing, radius hard-code tùy ý và CSS trùng lặp giữa các trang.
3. Thiết lập **Single Source of Truth** cho toàn bộ Design Tokens và Semantic Colors.
4. Chuẩn hóa bộ Base Components (`Select`, `Input`, `Button`, `Card`, `Badge`, `Modal`, `Table`, `Tabs`, `EmptyState`) hỗ trợ đầy đủ các trạng thái tương tác.
5. Đảm bảo độ tương phản màu chuẩn **WCAG AA** và tối ưu hiển thị tiếng Việt Unicode NFC.
6. Thiết lập công cụ kiểm tra tự động chống tái phát lỗi hard-code style (Automated Regression Prevention).

---

## 2. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [x] **AC-1 (Audit & Triage):** Quét toàn bộ codebase, phát hiện và sửa sạch các lỗi độ tương phản thấp (`text-gray-300`, `text-gray-200`) và raw style.
- [x] **AC-2 (Central Design Tokens & Theme Foundation):**
  - Khởi tạo thư mục `src/design-system/tokens/` với đầy đủ: `colors.ts`, `typography.ts`, `spacing.ts`, `radius.ts`, `shadows.ts`, `borders.ts`, `motion.ts`, `z-index.ts`.
  - Tích hợp Semantic CSS Variables vào `src/app/globals.css` và `tailwind.config.ts`.
- [x] **AC-3 (Surface Hierarchy & Semantic Colors):**
  - Thiết lập phân cấp 4 tầng thị giác: `--bg-app` (#F4F6FA) ➔ `--surface-card` (#FFFFFF) ➔ `--surface-section` (#F8FAFC) ➔ `--surface-input` (#FFFFFF/Viền rõ nét).
  - Tách biệt rõ ràng các cấp độ tương tác (Default, Hover, Focus ring 3px, Selected, Disabled, Error).
- [x] **AC-4 (Standardized Base Components Contract):**
  - Xây dựng component `<Select />` dùng chung với đầy đủ contract trạng thái và contrast cao.
  - Xây dựng `<Button />`, `<Input />`, `<Card />`, `<Badge />`, `<Table />`, `<Tabs />`, `<EmptyState />`.
- [x] **AC-5 (Typography & Vietnamese NFC):**
  - Chuẩn hóa Typography scale (Display, H1-H4, Title, Body, Caption).
  - Hàm `normalizeVietnameseText` và subset Google Font `latin, vietnamese`.
- [x] **AC-6 (Spacing, Radius & Shadow Scale):**
  - Chuẩn hóa spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64px).
  - Chuẩn hóa radius và shadow levels.
- [x] **AC-7 (Golden Milestone Unit POC & Batch Migration):**
  - Triển khai POC mẫu chuẩn tại Global Layout (`SiteHeader`, `BottomNav`, `RootLayout`, `ViewContainer`, `globals.css`).
  - Migrate an toàn 4 nhóm màn hình (Dashboard, Attendance, Homeroom, Portal, Classes, Reports, Settings, Login, Import) bảo toàn 100% logic.
- [x] **AC-8 (Component Catalog & Developer Guide):**
  - Re-export chuẩn từ `src/design-system/index.ts` và `src/components/ui/*`.
- [x] **AC-9 (Automated Regression Prevention):**
  - Viết script `scripts/qa/check-ui-lint.mjs` và gắn lệnh `npm run ui:lint`.
- [x] **AC-10 (Zero-Error Verification):**
  - `npm run ui:lint`, `npx tsc --noEmit` và `npm run build` thành công 100% không có lỗi.
