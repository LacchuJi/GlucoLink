# Bulletproof Telehealth Messaging Sync Fix Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Fix the 3 root causes preventing message synchronization between patient and doctor dashboards (including Clinician Preview mode).

---

### Task 1: Rewrite `/api/clinical/messages` GET & POST Handlers
**Files:**
- Modify: `src/app/api/clinical/messages/route.ts`

**Step 1: Implement fallback thread matching & preview mode support**
- If `user.role === "DOCTOR"` without `queryPatientId`: resolve default target patient from doctor's care panel or demo assignments and return messages.
- If `user.role === "PATIENT"`: query all messages where `patientId === patient.id` (no restrictive `doctorId` filter).
- In `POST`: Auto-upsert `CareAssignment` if missing.

---

### Task 2: Patient Dashboard Messaging Feed Integration
**Files:**
- Modify: `src/features/dashboard/dashboard.tsx`

**Step 1: Ensure `fetchMessages()` handles preview mode and updates unread badge & toast alerts**

---

### Task 3: Clinician Dashboard Patient Thread Sync
**Files:**
- Modify: `src/features/clinical/clinician-dashboard.tsx`

**Step 1: Ensure `fetchMessages()` auto-updates patient list and thread selection**

---

### Task 4: Verification & Build
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
