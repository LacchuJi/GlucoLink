# Clinician Telehealth Chat Responsive Layout Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Ensure Doctor Telehealth chatbox scales cleanly when window is resized without clipping buttons, wrapping text awkwardly, or overflowing containers.

---

### Task 1: Update CSS Rules (`src/app/clinical.css`)
**Files:**
- Modify: `src/app/clinical.css`

**Step 1: Add responsive media queries for `.messages-tab` and `min-width: 0` rules**

---

### Task 2: Harden JSX Flexbox Controls (`src/features/clinical/clinician-dashboard.tsx`)
**Files:**
- Modify: `src/features/clinical/clinician-dashboard.tsx`

**Step 1: Add `minWidth: 0`, `whiteSpace: "nowrap"`, `flexShrink: 0` to form inputs & action buttons**

---

### Task 3: Verification & Build
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
