# Implementation Plan - Multiple Sheets Export

## Goal
Modify the "Xuất Excel" functionality in the Reports page to output a **single Excel file** containing multiple sheets (one per class), instead of downloading multiple individual files. This prevents browser popup warnings and improves user experience.

## User Review Required
> [!NOTE]
> This change will result in a potentially larger file download if many classes are selected, but it completely solves the "multiple download blocked" issue.

## Proposed Changes

### Reports Page
#### [MODIFY] [page.tsx](file:///c:/AI%20APP/app-diemdanh/src/app/reports/page.tsx)
- Refactor `handleExport` function.
- Remove the loop that calls `exportMonthlyReport` for each class.
- Instead, create a loop to **fetch** all data first, push to an array.
- Call `exportMonthlyReport` **once** with the array of all class data.
- Update the filename to be generic (e.g., `Báo_Cáo_Tháng_X_Y_Tong_Hop`) if multiple classes are selected.

## Verification Plan

### Manual Verification
1.  **Select Multiple Classes**: Go to `/reports`, select 2-3 specific classes.
2.  **Export**: Click "Xuất Excel".
3.  **Verify**:
    -   Only **one** file is downloaded.
    -   Open the Excel file.
    -   Verify there are **multiple tabs (sheets)** at the bottom, one for each class (e.g., "Lớp 6A1", "Lớp 9A1").
    -   Check data in each sheet.
4.  **Select All**: Clear selection (defaults to all classes) and Export. Verify single file with all class sheets.
