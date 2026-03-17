# Plan: Core Attendance & Smart Stats
Created: 2026-02-01 00:00:00
Status: 🟡 In Progress

## Objective
Focus on the two core values requested by the user:
1.  **Fast Attendance Taking**: Minimize clicks. "Step by step" flow.
2.  **Smart Statistics**: Visual stats filtered by Date/Class/Time. **Only show absences**.

## Phase 01: Optimizer Attendance Flow
**State**: ✅ Completed
**Problem**: Currently, `/classes` shows all classes at once (54 classes). Hard to find specific class.
**Solution**:
- [x] **Filter by Grade (Khối)**: Add tabs or buttons for "Khối 6 | Khối 7 | Khối 8 | Khối 9".
- [x] **Class List Upgrade**: Simplified list + "Take Attendance" button.
- [x] **Attendance UI Polish**: Clearer P/K buttons.

## Phase 02: Advanced Smart Reports
**State**: ✅ Completed
**Problem**: The current `/reports` page uses fake data and lacks flexibility.
**Solution**:
- [x] Implement `getReportData` in adapters.
- [x] **Advanced Filter Bar**: Subject, Time selection.
- [x] **Visual Report Types**: Absence List, Stats.

## Phase 03: Test Tools & Data Mocking
**State**: ✅ Completed
**Problem**: Testing reports complex without data.
**Solution**:
- [x] **Mock Generator**: `/settings` page.
- [x] **Deep Clean Tools**: Clear data.

## Phase 04: UI Refinements & Extended Statuses
**State**: ⬜ Pending
**Problem**:
1.  User wants better navigation in `/classes`.
2.  Current statuses (P/K) are insufficient. Needs Late, Violation, Pending.
**Solution**:
- [ ] **Data Model Update**:
    -   Update `AttendanceStatus` type: Add `V`, `T`, `VP`.
    -   Update `AttendanceRecord` interface: Add `notes: Record<string, string>` to store violation details.
- [ ] **Classes Page (`/classes`)**:
    -   Rename to "Quản lý lớp".
    -   **"Điểm Danh Nhanh" Panel**: Grade Buttons -> Class Dropdown (w/ Teacher Name) -> Go Button.
    -   **Footer Stats**: Total Classes/Students.
- [ ] **Attendance Page (`/attendance`)**:
    -   **New Status Buttons**:
        -   **C** (Present - Explicit).
        -   **V** (Vắng - Chưa rõ lý do).
        -   **T** (Trễ).
        -   **VP** (Vi Phạm): Opens a popover/modal to select violation type (Trang phục, Đt, Chạy giỡn...) or Custom Input (Red text).
    -   **Bottom Stats**: Update table to count new statuses.

## Files to Modify
- `src/types/models.ts` (Update Map/Types).
- `src/components/class-list.tsx` (Quick Attendance).
- `src/app/attendance/page.tsx` (New Buttons & Logic).
- `src/app/reports/page.tsx` (Update stats to include V/T/VP).

## Commands
- `/code phase-04`: Upgrade Attendance Logic & UI.
