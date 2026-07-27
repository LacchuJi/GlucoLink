# Design Document: Remove Duplicate Portal Switch Button

## Problem Root Cause
- **Duplicate Action Buttons:** Both `<AppHeader />` (via `secondaryActionLabel`) and `<AppSidebar />` (via `.mode` button) rendered identical `Switch to Clinician Panel` / `Switch to Patient View` buttons simultaneously.

---

## Solution
- **Keep Left Sidebar Switcher:** Keep the dedicated portal switcher in `<AppSidebar />` at the bottom of the navigation bar.
- **Remove Header Secondary Action:** Remove `secondaryActionLabel` and `onSecondaryAction` props from `<AppHeader />` in `src/features/dashboard/dashboard.tsx` and `src/features/clinical/clinician-dashboard.tsx`.
