# Real-Time Message Sync & Toast Notification Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Enable continuous 1.5s background message sync and build an in-app Floating Toast Notification system with header bell badge counters.

---

### Task 1: Create Toast Notification Component (`src/components/notification-toast.tsx`)
**Files:**
- Create: `src/components/notification-toast.tsx`

**Step 1: Build `NotificationToast` component**
Render a floating glassmorphism alert card with message snippet, sender info, click-to-navigate action, and auto-dismiss timer.

---

### Task 2: Patient Dashboard Real-Time Sync & Notifications
**Files:**
- Modify: `src/features/dashboard/dashboard.tsx`

**Step 1: Fix polling loop to run continuously every 1500ms**
Detect incoming messages, trigger `NotificationToast`, and update header bell unread counter badge.

---

### Task 3: Clinician Dashboard Real-Time Sync & Notifications
**Files:**
- Modify: `src/features/clinical/clinician-dashboard.tsx`

**Step 1: Fix polling loop to run continuously every 1500ms**
Detect incoming patient messages, trigger `NotificationToast`, and update patient thread list unread count.

---

### Task 4: Verification & Tests
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
