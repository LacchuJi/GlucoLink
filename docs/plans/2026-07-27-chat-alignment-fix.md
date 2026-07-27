# Dual-Side Chat Alignment Fix Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Ensure messages sent by Doctor align to the Right in Doctor view & Left in Patient view, and messages sent by Patient align to the Right in Patient view & Left in Doctor view.

---

### Task 1: Update API Route Payload Schema (`src/app/api/clinical/messages/route.ts`)
**Files:**
- Modify: `src/app/api/clinical/messages/route.ts`

**Step 1: Add `senderRole` ("DOCTOR" | "PATIENT") to `postSchema` and `POST` body logic**

---

### Task 2: Pass `senderRole` in Dashboards (`src/features/clinical/clinician-dashboard.tsx` & `src/features/dashboard/dashboard.tsx`)
**Files:**
- Modify: `src/features/clinical/clinician-dashboard.tsx`
- Modify: `src/features/dashboard/dashboard.tsx`

**Step 1: Include `senderRole: "DOCTOR"` in clinician POST requests and `senderRole: "PATIENT"` in patient POST requests**

---

### Task 3: Verification & Build
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
