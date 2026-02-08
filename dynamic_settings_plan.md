# Implementation Plan - Customizable System Settings

## Goal
Replace hardcoded values (School Name, Violation Types, Attendance Statuses) with a dynamic configuration system that users can edit via the Settings page.

## User Review Required
> [!IMPORTANT]
> This change introduces a new `settings.json` file in the data directory.
> I will assume valid default values ("THCS TRẦN BỘI CƠ", existing statuses) if the settings file is missing.

## Proposed Changes

### 1. Data Models & Adapter
#### [MODIFY] [src/types/models.ts](file:///c:/AI%20APP/app-diemdanh/src/types/models.ts)
- Add `SystemSettings` interface.
- Add `ViolationType` and `StatusConfig` types.

#### [MODIFY] [src/services/db-adapter.ts](file:///c:/AI%20APP/app-diemdanh/src/services/db-adapter.ts)
- Add `getSettings()` and `updateSettings()` methods to interface.

#### [MODIFY] [src/services/local-adapter.ts](file:///c:/AI%20APP/app-diemdanh/src/services/local-adapter.ts)
- Implement `getSettings` reading from `data/settings.json`.
- Implement `updateSettings` writing to `data/settings.json`.
- Provide defaults if file doesn't exist.

### 2. Server Actions
#### [MODIFY] [src/app/actions/settings.ts](file:///c:/AI%20APP/app-diemdanh/src/app/actions/settings.ts)
- Add `getSystemSettings()` (Server Action).
- Add `saveSystemSettings()` (Server Action).

### 3. Frontend Context & UI
#### [NEW] [src/context/settings-context.tsx](file:///c:/AI%20APP/app-diemdanh/src/context/settings-context.tsx)
- Create a Context Provider to load settings on app mount and provide them globally.

#### [MODIFY] [src/app/layout.tsx](file:///c:/AI%20APP/app-diemdanh/src/app/layout.tsx)
- Wrap app with `SettingsProvider`.

#### [MODIFY] [src/app/settings/page.tsx](file:///c:/AI%20APP/app-diemdanh/src/app/settings/page.tsx)
- Add a new "Cấu Hình Hệ Thống" section.
- Form inputs for: School Name.
- Dynamic list editor for: Violation Types.
- (Optional for now) Status Color editor.

### 4. Components Refactoring
#### [MODIFY] [src/components/site-header.tsx](file:///c:/AI%20APP/app-diemdanh/src/components/site-header.tsx)
- Use `useSettings()` to display School Name.

#### [MODIFY] [src/components/attendance-sheet.tsx](file:///c:/AI%20APP/app-diemdanh/src/components/attendance-sheet.tsx)
- Use `settings.violationTypes` instead of hardcoded `COMMON_VIOLATIONS`.

#### [MODIFY] [src/lib/export-utils.ts](file:///c:/AI%20APP/app-diemdanh/src/lib/export-utils.ts)
- Update `exportMonthlyReport` to accept `schoolName` as a parameter (passed from Page component which has access to Settings).

## Verification Plan

### Manual Verification
1.  **Check Defaults**: Open app, verify School Name is still "THCS TRẦN BỘI CƠ" (default).
2.  **Edit Settings**:
    -   Go to `/settings`.
    -   Change School Name to "THCS NGUYỄN DU".
    -   Add a new Violation Type "Quên khăn quàng".
    -   Save.
3.  **Verify Persistence**: Reload page. Verify School Name in header is "THCS NGUYỄN DU".
4.  **Verify Usage**:
    -   Go to `/classes`, enter a class.
    -   Check Violation Popup: Should show "Quên khăn quàng".
    -   Select "Quên khăn quàng" and save.
5.  **Verify Export**:
    -   Go to `/reports`.
    -   Export Excel.
    -   Open Excel, check Header title is "TRƯỜNG THCS NGUYỄN DU".
