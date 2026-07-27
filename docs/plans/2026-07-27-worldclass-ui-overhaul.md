# World-Class Medical Portal UI Overhaul Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Completely rebuild CSS styling and component layout for Patient and Clinician portals to eliminate unstyled buttons, text overlaps, squished containers, and dark theme background glitches.

---

### Task 1: Re-architect CSS Design Systems (`src/app/globals.css` & `src/app/clinical.css`)
**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/clinical.css`

**Step 1: Overhaul `globals.css` for Patient Portal**
Define robust card layouts, smooth margins, flex alignment, and dark mode rules.

**Step 2: Overhaul `clinical.css` for Clinician Portal**
Restore full clinical CSS rules for `.alert`, `.alert-severity`, `.alert-copy`, `.alert-action`, `.patient-panel`, `.patient-row`, `.ai-card`, `.filters button`, `.risk` in both light and dark themes.

---

### Task 2: Polish Clinician Dashboard JSX (`src/features/clinical/clinician-dashboard.tsx`)
**Files:**
- Modify: `src/features/clinical/clinician-dashboard.tsx`

**Step 1: Fix raw unstyled buttons and text overlaps**
Replace raw buttons with proper CSS classes (`.alert-action`, `.dismiss`, `.link-button`, `.all-patients`, `.btn-primary`, `.btn-secondary`).

---

### Task 3: Polish Patient Dashboard JSX (`src/features/dashboard/dashboard.tsx`)
**Files:**
- Modify: `src/features/dashboard/dashboard.tsx`

**Step 1: Ensure clean card spacing, badge pills, and chart grid alignment**

---

### Task 4: Verification & Build
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
