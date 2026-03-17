# Plan: Quick Attendance by Block (Điểm danh theo Khối)
Created: 260202-0050
Status: 🟡 In Progress

## Overview
Nâng cấp tính năng Điểm Danh Nhanh (Quick Attendance) cho phép điểm danh hàng loạt theo Khối lớp.
- **Chế độ Lớp (Hiện tại):** Chọn Khối -> Chọn Lớp -> Điểm danh từng em.
- **Chế độ Khối (Mới):** Chọn Khối -> Hiện bảng tổng hợp các lớp -> Điểm danh nhanh theo số lượng (Phép/Vắng/Trễ...) bằng popup.

## Tech Stack
- Frontend: Next.js, React, TailwindCSS, Lucide Icons, Shadcn UI (Dialog/Popover)
- Backend: Server Actions (existing)
- Database: MongoDB (via Mongoose models)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Setup & UI Structure | ✅ Complete | 100% |
| 02 | Data Fetching (Block Mode) | ✅ Complete | 100% |
| 03 | Quick Selection Interaction | ✅ Complete | 100% |
| 04 | Integration & Save Logic | ✅ Complete | 100% |
| 05 | UI Refinements & Violation Logic | ✅ Complete | 100% |

## Detailed Phases

### Phase 01: Setup & UI Structure
- Refactor `QuickAttendancePage` to support 2 modes: `CLASS` (default) and `BLOCK`.
- Add Toggle Button at the top to switch between modes.
- Implement UI for Block Mode:
    - Grade Selector (Khối 6, 7, 8, 9).
    - "Bắt đầu" Button triggers the Table View.
    - Placeholder Table Structure: Tên Lớp | Sỉ số | Hiện Diện | P | V | T | VP.

### Phase 02: Data Fetching (Block Mode)
- Create Server Action `getGradeAttendanceSummary(grade, date)`:
    - Return list of classes in grade.
    - For each class: Total Students, Current Attendance counts (P/K/V/T/VP), List of students with their current status.
- Integrate data into the Table View.

### Phase 03: Quick Selection Interaction
- Build `StudentSelectorDialog` component:
    - Input: ClassID, Status (e.g., 'P').
    - UI: Grid of students in that class.
    - Behavior: Toggle student selection.
    - Action: "Lưu" updates the attendance status for selected students to 'P' (and clears previous status if any).
- Connect Table Cells (P/V/T/VP counts) to open this Dialog.

### Phase 04: Integration & Save Logic
- Implement `saveBlockAttendance` (or reuse `saveAttendance` per class).
- Real-time UI update after saving from Dialog.
- Optimistic updates for snappy feel.
- Final Testing.

## Quick Commands
- Start Phase 1: `/code phase-01`
