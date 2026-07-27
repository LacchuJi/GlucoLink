# Remove Duplicate Portal Switch Button Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Remove duplicate `Switch to Clinician Panel` / `Switch to Patient View` buttons from `<AppHeader />` in both dashboards.

---

### Task 1: Update Dashboards (`src/features/dashboard/dashboard.tsx` & `src/features/clinical/clinician-dashboard.tsx`)
**Files:**
- Modify: `src/features/dashboard/dashboard.tsx`
- Modify: `src/features/clinical/clinician-dashboard.tsx`

**Step 1: Remove `secondaryActionLabel` & `onSecondaryAction` from `<AppHeader />`**

---

### Task 2: Verification & Build
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
