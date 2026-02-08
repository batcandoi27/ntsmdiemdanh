# Phase 02: Class List & Management Interface
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Create a visual interface for managing classes (`/classes`). Users should be able to view all classes, add new classes manually, and edit existing class details.

## Requirements
### Functional
- [ ] Display list of classes with summary stats (Student count, Teacher name).
- [ ] Add "Create Class" button/modal.
- [ ] Edit "Class Details" (Name, Grade, Teacher, Note).
- [ ] Delete "Class" (with confirmation).

### Non-Functional
- [ ] Responsive design for list view.
- [ ] Optimistic updates for better UX.

## Implementation Steps
1. [ ] Create/Update `/classes` page to display class grid/list.
2. [ ] Create generic Modal component for Add/Edit Class forms.
3. [ ] Implement Server Actions: `createClass`, `updateClass`, `deleteClass`.
4. [ ] Integrate actions with UI.

## Files to Create/Modify
- `src/app/classes/page.tsx` - Main class list UI.
- `src/app/classes/actions.ts` - CRUD actions for classes.
- `src/components/ui/modal.tsx` - Reusable modal.
- `src/components/class-form.tsx` - Form for adding/editing classes.

## Test Criteria
- [ ] Can view all classes.
- [ ] Can add a new class "9Z9".
- [ ] Can rename class "9Z9" to "9A9".
- [ ] Can delete class "9A9".
- [ ] UI refreshes correctly after operations.

---
Next Phase: [Phase 03: Student Management (CRUD)](./phase-03-student-management.md)
