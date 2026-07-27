# Pixel-Perfect Layout Overhaul Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Fix all remaining visual alignments, patient row spacing, stat grid tab clutter, and card container clipping across Patient and Clinician portals.

---

### Task 1: Refactor CSS Layout Tokens & List Card Headers (`src/app/globals.css` & `src/app/clinical.css`)
**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/clinical.css`

**Step 1: Fix `.list-card`, `.card-title`, and `.patient-row`**
Add explicit container padding, flex alignment, and spacing rules.

---

### Task 2: Refactor Clinician Dashboard JSX Layout (`src/features/clinical/clinician-dashboard.tsx`)
**Files:**
- Modify: `src/features/clinical/clinician-dashboard.tsx`

**Step 1: Hide stat cards on non-overview tabs, align `Configure rules →` in `.title-row`, and fix `PatientRow` spacing**

---

### Task 3: Verification & Build
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
