# Telehealth Messaging System Overhaul Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Overhaul the messaging experience with read receipts (`isRead`), glucose reading attachments, AI response chips, and interactive Care Directive action cards.

---

### Task 1: Schema Updates & Database Migration
**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add attachment & read status fields to `ChatMessage` model**
Add `readingId`, `attachmentJson`, `isRead`, and `readAt` to `ChatMessage`. Run `npx prisma db push`.

---

### Task 2: Backend API Route Overhaul (`/api/clinical/messages`)
**Files:**
- Modify: `src/app/api/clinical/messages/route.ts`

**Step 1: Enhance `GET` and `POST` handlers**
- `GET`: Mark fetched incoming messages as `isRead: true, readAt: new Date()`. Return unread counts.
- `POST`: Accept optional `readingId` and `attachmentJson` (for glucose attachments or Care Directive cards).

---

### Task 3: Patient Dashboard Messaging UI Overhaul
**Files:**
- Modify: `src/features/dashboard/dashboard.tsx`

**Step 1: Add Reading Attachment Modal & Care Directive Action Card handler**
Add `📎 Attach Glucose` button to chat bar, render attached glucose card bubbles, render Care Directive cards with 1-click **"Accept & Update Care Plan"** action.

---

### Task 4: Clinician Dashboard Messaging UI Overhaul
**Files:**
- Modify: `src/features/clinical/clinician-dashboard.tsx`

**Step 1: Add AI Response Chips & Send Care Directive Tool**
Display AI suggested quick-reply chips above chat input. Add a `✚ Prescribe Directive` button to issue structured Care Plan adjustments into the thread.

---

### Task 5: Verification & Tests
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
