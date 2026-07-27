# Universal Button Reset & Layout Alignment Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a global CSS button reset and refactor all component buttons and modal close icons to eliminate native browser 3D white button fallbacks and text collisions.

---

### Task 1: Add Global CSS Button Reset & Component Styling (`src/app/globals.css` & `src/app/clinical.css`)
**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/clinical.css`

**Step 1: Add `button` reset**
Add `button { border: 0; background: transparent; font-family: inherit; margin: 0; padding: 0; outline: none; cursor: pointer; }`.

**Step 2: Add explicit component button classes**
Add `.btn-primary`, `.btn-secondary`, `.btn-link`, `.btn-icon`, `.close`, `.care-top button`, `.card-title button`, `.quick-actions button`.

---

### Task 2: Refactor Patient Dashboard & Modals (`src/features/dashboard/dashboard.tsx`)
**Files:**
- Modify: `src/features/dashboard/dashboard.tsx`

**Step 1: Attach explicit button classes and fix modal layout padding**
Ensure `View history →`, `NEXT UP`, `Mark taken`, and modal close `×` use explicit classes.

---

### Task 3: Refactor Clinician Dashboard & Modals (`src/features/clinical/clinician-dashboard.tsx`)
**Files:**
- Modify: `src/features/clinical/clinician-dashboard.tsx`

**Step 1: Attach explicit button classes across Clinician dashboard**

---

### Task 4: Verification & Build
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
