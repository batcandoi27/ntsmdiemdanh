# Phase 01: Setup & Reset Functionality
Status: ⬜ Pending
Dependencies: None

## Objective
Establish the foundation for Class Management and implement the critical "Reset All Data" functionality requested by the user. Ensure the Import page UI is updated to include this reset capability.

## Requirements
### Functional
- [ ] Implement `clearCurrentYearData` in `DbAdapter` and `FirebaseAdapter`.
- [ ] Create server action `clearAllYearData` in `src/app/actions/import.ts`.
- [ ] Add "Clear Data" (Xóa Dữ Liệu Cũ) button to the Import page (`src/app/import/page.tsx`).
- [ ] Add confirmation dialog/alert before clearing data to prevent accidental deletions.

### Non-Functional
- [ ] Security: Ensure only authorized users (or current MVP context) can perform the reset.
- [ ] Feedback: Show success/error messages clearly to the user.

## Implementation Steps
1. [ ] Define `clearCurrentYearData` in `DbAdapter` interface.
2. [ ] Implement logic in `FirebaseAdapter` to delete all classes and students for the current year.
3. [ ] Expose this logic via `clearAllYearData` server action.
4. [ ] Update `ImportPage` UI to include the "Clear Data" button and handle the reset flow with confirmation.

## Files to Create/Modify
- `src/services/db-adapter.ts` - Update interface.
- `src/services/firebase-adapter.ts` - Implement deletion logic.
- `src/app/actions/import.ts` - Export server action.
- `src/app/import/page.tsx` - Update UI.

## Test Criteria
- [ ] "Clear Data" button appears on Import page.
- [ ] Clicking button prompts for confirmation.
- [ ] Confirming deletes all class and student data for the current year in Firestore.
- [ ] UI displays success message upon completion.
- [ ] `/classes` page shows empty state after reset.

---
Next Phase: [Phase 02: Class List & Management Interface](./phase-02-class-management.md)
