# Prescription Directives Visibility Fix Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Ensure prescription directives issued by doctors are persisted and immediately visible to patients in their messages feed.

---

### Task 1: Auto-Assign Patient & Sync Messages (`src/app/api/clinical/patients/route.ts` & `src/app/api/clinical/messages/route.ts`)
**Files:**
- Modify: `src/app/api/clinical/patients/route.ts`
- Modify: `src/app/api/clinical/messages/route.ts`

**Step 1: Upsert CareAssignment for active user patient in `patients/route.ts` and write directives to user patient thread in `messages/route.ts`**

---

### Task 2: Verification & Build
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
