# Neon DB & Premium Auth Overhaul Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Overhaul the Better Auth authentication UI and document Neon PostgreSQL setup steps.

---

### Task 1: Overhaul Auth Styling (`src/app/auth.css`)
**Files:**
- Modify: `src/app/auth.css`

**Step 1: Replace legacy auth styles with a theme-aware design system**

---

### Task 2: Enhance Sign-in Page Component (`src/app/sign-in/page.tsx`)
**Files:**
- Modify: `src/app/sign-in/page.tsx`

**Step 1: Refine role toggles, form layout, error banners, and demo buttons**

---

### Task 3: Verification & Build
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
