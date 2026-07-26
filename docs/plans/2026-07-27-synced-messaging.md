# Database-Backed Synced Messaging Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build persistent, database-backed chat messaging between patients and their assigned doctors with automatic 3s polling synchronization.

**Architecture:** Add `ChatMessage` model in Prisma, implement `GET` and `POST` `/api/clinical/messages` with `CareAssignment` authorization, and hook both Patient and Clinician UI components to auto-poll and transmit messages.

**Tech Stack:** Next.js 15 App Router, Prisma ORM, PostgreSQL, React (TypeScript).

---

### Task 1: Schema Updates
**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add `ChatMessage` model to schema**
Add `ChatMessage` model and update `Patient` and `Doctor` relations in `prisma/schema.prisma`.

**Step 2: Sync database & generate Prisma client**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx prisma db push`
Expected: `Your database is now in sync with your Prisma schema.`

---

### Task 2: Backend API Routes
**Files:**
- Create: `src/app/api/clinical/messages/route.ts`

**Step 1: Implement `GET` & `POST` endpoints in `/api/clinical/messages/route.ts`**
- `GET`: resolve user (Patient or Doctor), fetch messages for patient/doctor pair.
- `POST`: validate content, authorize `CareAssignment`, create `ChatMessage`, and trigger audit log.

**Step 2: Verify API manually or via TypeScript check**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Expected: 0 errors.

---

### Task 3: Patient Dashboard Messaging Integration
**Files:**
- Modify: `src/features/dashboard/dashboard.tsx`

**Step 1: Hook `messages` tab in `Dashboard` to `/api/clinical/messages`**
- Fetch messages from `/api/clinical/messages` on load and poll every 3 seconds while active tab is `"messages"`.
- Send message via `POST /api/clinical/messages`.

---

### Task 4: Clinician Dashboard Messaging Integration
**Files:**
- Modify: `src/features/clinical/clinician-dashboard.tsx`

**Step 1: Hook `messages` tab in `ClinicianDashboard` to `/api/clinical/messages`**
- Load assigned patient list and fetch thread for `selectedPatientId`.
- Poll every 3 seconds while active tab is `"messages"`.
- Send message via `POST /api/clinical/messages`.

---

### Task 5: Verification & Tests
**Files:**
- Test: `npx vitest run` & `npx tsc --noEmit`

**Step 1: Run type checking & unit tests**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: All tests pass cleanly.
