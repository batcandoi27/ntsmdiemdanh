# Optimization of Reports Page Data Loading

## Goal
Optimize the `/reports` page performance by removing automatic data fetching and introducing a manual "Báo Cáo" (Generate Report) trigger. This prevents loading all class data on initial load and allows users to refine filters before fetching.

## Proposed Changes

### 1. `src/app/reports/page.tsx`
- **Remove** the `useEffect` that triggers `handleFetch` when `dateRange` or `selectedClasses` changes.
- **Pass** a new prop `onGenerateReport={handleFetch}` to the `ReportsFilter` component.
- **Update** the render logic to handle the "no data fetched yet" state more gracefully (optional, but good UX). currently it shows empty list which is acceptable.

### 2. `src/components/reports/reports-filter.tsx`
- **Add** a new prop `onGenerateReport: () => void`.
- **Add** a "Báo Cáo" (Generate Report) button in the toolbar.
    - **Icon**: `Search` or `Play` or `FileBarChart`.
    - **Style**: Primary color (Blue), prominent.
    - **Position**: Next to the "Xuất Excel" button or near the class filter.
- **Trigger**: calling `onGenerateReport` on click.

## Verification
- Open `/reports`.
- Verify no data is loaded initially (network tab).
- Select a specific class. Verify no data load yet.
- Click "Báo Cáo".
- Verify data loads for the selected class.
- Change date. Verify no auto reload.
- Click "Báo Cáo". Verify reload with new date.
