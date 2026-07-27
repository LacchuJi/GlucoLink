# Double Border Elimination & Equal Height Cards Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Remove duplicate divider lines under `Recent readings` and enforce equal height flex layout between `.list-card` and `.care-card`.

---

### Task 1: Update CSS Tokens (`src/app/globals.css`)
**Files:**
- Modify: `src/app/globals.css`

**Step 1: Remove `.card-title` border-bottom and add `.care-card` flex rules**

---

### Task 2: Verification & Build
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
