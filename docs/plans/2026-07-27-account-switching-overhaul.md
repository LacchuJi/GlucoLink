# Account, Login, and Workspace Switching Overhaul Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Overhaul the sign-in/registration flow with role selection (Patient vs Clinician), add a 1-click Demo Account quick switcher, and build a profile dropdown workspace switcher.

---

### Task 1: Backend Onboarding & Session Role Endpoints
**Files:**
- Modify: `src/app/api/onboarding/doctor/route.ts`
- Modify: `src/app/api/onboarding/patient/route.ts`
- Create: `src/app/api/me/route.ts`

**Step 1: Update onboarding endpoints to support JSON body parameters & create default records**
Support `{ clinicName }` in `POST /api/onboarding/doctor` to set `user.role = "DOCTOR"` and auto-create Organization/Doctor profiles.
Create `GET /api/me` returning current user profile, role, and associated patient/doctor profile IDs.

---

### Task 2: Dual-Role Sign-Up & Smart Sign-In Form
**Files:**
- Modify: `src/app/sign-in/page.tsx`
- Modify: `src/app/auth.css`

**Step 1: Overhaul `src/app/sign-in/page.tsx`**
Add role selection buttons (`👤 Patient` vs `🩺 Doctor`), conditionally prompt for clinic name on Doctor sign-up, and implement smart post-login redirect (`/clinician` for doctors, `/` for patients).

---

### Task 3: 1-Click Demo Account Quick Switcher
**Files:**
- Create: `src/app/api/auth/demo/route.ts`
- Modify: `src/app/sign-in/page.tsx`

**Step 1: Build `POST /api/auth/demo` endpoint**
Auto-provision or fetch demo accounts (`doctor@glucolink.demo` & `patient@glucolink.demo`), create valid session cookies, and return target redirect URL. Add quick demo login buttons to `sign-in/page.tsx`.

---

### Task 4: Interactive Profile Dropdown & Workspace Switcher Component
**Files:**
- Create: `src/components/profile-menu.tsx`
- Modify: `src/features/dashboard/dashboard.tsx`
- Modify: `src/features/clinical/clinician-dashboard.tsx`

**Step 1: Create `ProfileMenu` component**
Render user details, active role badge, workspace switch actions (`⇄ Switch to Clinician Panel` / `⇄ Switch to Patient View`), and `Sign Out`. Replace plain profile buttons in `dashboard.tsx` and `clinician-dashboard.tsx`.

---

### Task 5: Verification & Tests
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
