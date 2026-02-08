# Phase 03: Student Management (CRUD)
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Allow detailed management of students within a specific class. Users can add, edit, move, or delete students.

## Requirements
### Functional
- [ ] View student list within a Class Detail page (`/classes/[id]`).
- [ ] Add new student (Manual entry).
- [ ] Edit student info (Name, DOB, Gender, etc.).
- [ ] Delete student.
- [ ] (Optional) Move student to another class.

## Implementation Steps
1. [ ] Enhance `/classes/[id]` page to show student table.
2. [ ] create `StudentForm` component.
3. [ ] Implement Server Actions: `createStudent`, `updateStudent`, `deleteStudent`.
4. [ ] Implement "Reset Attendance" for student (optional).

## Files to Create/Modify
- `src/app/classes/[id]/page.tsx` - Class detail & student list.
- `src/app/actions/student.ts` - Student CRUD actions.
- `src/components/student-form.tsx`.

## Test Criteria
- [ ] Can see list of students in a class.
- [ ] Can add a new student manually.
- [ ] Can edit a student's name.
- [ ] Can delete a student.

---
Next Phase: [Phase 04: Integration & Polishing](./phase-04-integration.md)
