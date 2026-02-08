# Task: Customizable Settings Refactoring

## Research & Planning
- [ ] Search for hardcoded School Name ("TRẦN BỘI CƠ")
- [ ] Search for hardcoded Violation Types/Statuses
- [ ] Identify other potential hardcoded values (Years, Semesters)
- [ ] Create Implementation Plan for dynamic settings

## Implementation
- [ ] Create `SettingsContext` or data store for Global Settings
- [ ] Update `SettingsPage` to include forms for:
    - [ ] School Info (Name, Logo?)
    - [ ] Attendance Statuses (Code, Label, Color)
- [ ] Refactor `ReportsPage` / `ExportUtils` to use dynamic School Name
- [ ] Refactor `StatusBadge` / `ClassList` to use dynamic Statuses

## Verification
- [ ] Verify Settings persist after reload
- [ ] Verify Reports export uses new School Name
- [ ] Verify UI displays custom Status labels/colors
