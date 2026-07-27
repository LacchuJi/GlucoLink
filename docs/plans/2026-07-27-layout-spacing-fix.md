# Layout Spacing & Section Breathing Room Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Add spacious vertical margins between stat cards and lower grid section to fix cramped layout.

---

### Task 1: Update CSS Spacing Tokens (`src/app/globals.css`)
**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add `.lower-grid { margin-top: 28px; }` and adjust internal care card margins**

---

### Task 2: Verification & Build
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
