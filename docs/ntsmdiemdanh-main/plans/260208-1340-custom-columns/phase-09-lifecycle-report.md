# Phase 09: Lifecycle Logic & Advanced Reports
Status: ⬜ Pending
Dependencies: Phase 08 (Refinement)

## Objective
Implement final "Lifecycle" logic for Custom Columns (Daily, Period, One-time) as defined in the PRD. This includes ensuring `Attendance` only shows Daily columns, creating a new interface for Period/One-time data entry, and enhancing Reports with filters/presets.

## Features
1.  **Attendance UI Refinement**:
    *   Ensure `QuickAttendance` and `Attendance` page ONLY display columns with `frequency = 'daily'`.
    *   Integrate *Custom Daily Columns* into the Attendance interface (currently only fixed columns are shown).
2.  **Period & One-time Data Entry**:
    *   Create a new UI (e.g., in Class Details / "Sổ Theo Dõi") to input data for `period` and `one_time` columns.
    *   Data entry for "One-time" (Done/Pending checkboxes).
    *   Data entry for "Period" (Value/Money/Note).
3.  **Lifecycle Automation**:
    *   Implement logic to Auto-Archive `one_time` columns when all students are 'Done'.
    *   Implement logic to Auto-Archive `period` columns when `endDate` passes.
    *   Admin/Teacher tool to "Clone" period columns for new term.
4.  **Advanced Reports**:
    *   Update `ReportsFilter` to group columns by Frequency (Fixed/Daily, Period, One-time).
    *   Implement "Report Presets" (Save/Load column visibility configurations).
    *   Allow viewing Archived columns in history/reports.

## Implementation Steps

### 1. Attendance UI Refinement (Daily Columns)
- [ ] Refactor `QuickAttendance` to fetch `daily` custom columns.
- [ ] **[NEW] Add Settings to Toggle Visibility of Default Columns** (e.g., hide 'Vi Phạm'/'Khen Thưởng' if not used).
- [ ] Add UI to render dynamic buttons/inputs for Custom Daily columns in `MobileStudentCard`.
- [ ] Ensure `one_time` and `period` columns are filtered OUT of `QuickAttendance`.

### 2. Class Monitor UI (Period/One-time Input)
- [ ] Create new page/tab: `/classes/[id]/monitor` (Sổ Theo Dõi).
- [ ] Render lists of `period` and `one_time` columns.
- [ ] **One-time UI**: Grid/List with Checkboxes for each student.
- [ ] **Period UI (Single & Multi)**: 
    - [ ]Multi-Period Data Table.
    - [ ] Stats Calculation.
- [ ] **[NEW] Student Scope**: Assign specific students.
- [ ] **[NEW] Quick Input Tools**:
    - [ ] **Bulk Actions**: "Set All to Done", "Fill Value for All".
    - [ ] **Click-to-Toggle**: For boolean/status fields.
    - [ ] **Quick Picker**: For common notes/tags.

### 3. Lifecycle Logic
- [ ] Implement `checkAutoArchive(classId)` function in `column-service.ts`.
- [ ] **[NEW] Implement Confirmation UI**: Show notification/dialog "Archive this column?" instead of silent auto-archive.
- [ ] Add visual indicator for Archived columns in Settings/Reports.

### 4. Advanced Reports & Export
- [ ] Update `ReportsFilter` to group columns.
- [ ] Create `ReportPresetService`.
- [ ] **[NEW] Advanced Excel Export**:
    - [ ] Export structure: One Sheet per Class.
    - [ ] Columns: Include Fixed, Custom Daily, and expanded Multi-Period columns (e.g. Tuition T9, Tuition T10...).
    - [ ] Formatting: Headers, Styles.

## Files to Create/Modify
- `src/app/classes/[id]/monitor/page.tsx` (New Data Entry Page)
- `src/components/class-monitor/period-input.tsx` (New Component)
- `src/components/class-monitor/multi-period-input.tsx` (New Component for Table View)
- `src/services/record-service.ts` (New Service for Custom Records)
- `src/services/preset-service.ts` (New Service for Report Presets)
- `src/app/quick-attendance/page.tsx` (Update for Custom Daily & Visibility Settings)
- `src/app/reports/page.tsx` (Update for Presets)

## Test Criteria
- [ ] **Attendance**: Only Daily columns appear; Default columns can be hidden.
- [ ] **Monitor**: User can enter data for Multi-Period columns (Table View).
- [ ] **Stats**: Multi-period column shows aggregate totals correctly.
- [ ] **Archive**: System prompts user to archive.
- [ ] **Reports**: User can save a view preset and load it back.
