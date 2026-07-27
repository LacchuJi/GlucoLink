# Comprehensive UI & API Overhaul Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Eliminate all remaining visual flaws, alignment issues, contrast bugs, and preview mode 500 server errors across Patient and Clinician portals.

---

### Task 1: Fix API Route Authorization Fallbacks (`src/app/api/clinical/patients/route.ts` & `src/app/api/clinical/alerts/route.ts`)
**Files:**
- Modify: `src/app/api/clinical/patients/route.ts`
- Modify: `src/app/api/clinical/alerts/route.ts`

**Step 1: Update GET handlers**
Allow patients in Clinician Preview Mode to fetch assigned/demo patients and alerts without throwing 500 server errors.

---

### Task 2: Fix Layout & Typography Overlaps (`src/app/globals.css` & `src/app/clinical.css`)
**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/clinical.css`

**Step 1: Fix `.card-title`, `.care-top`, `.care-footer`, `.patient-panel-head`, `.ai-card`, and `.title-row`**
Add explicit flexbox rules, margins, paddings, and thin scrollbars.

---

### Task 3: Refactor Clinician Dashboard Header & Tabs (`src/features/clinical/clinician-dashboard.tsx`)
**Files:**
- Modify: `src/features/clinical/clinician-dashboard.tsx`

**Step 1: Hide top stats grid on Telehealth Feed tab to give full height to message threads**
Ensure search inputs and patient panels have clean high-contrast text.

---

### Task 4: Verification & Build
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
