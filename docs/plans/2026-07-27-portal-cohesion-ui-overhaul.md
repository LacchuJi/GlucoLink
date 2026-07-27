# Cohesive Portal UI Overhaul & Navigation Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Overhaul Patient and Clinician portals into a unified, highly polished, cohesive UI design with shared tokens, layout components, and dark/light mode integration.

---

### Task 1: Update Global Design System CSS (`src/app/globals.css` & `src/app/clinical.css`)
**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/clinical.css`

**Step 1: Define shared CSS variables for Light & Dark mode**
Add `.gl-card`, `.gl-stat-card`, `.gl-button`, `.gl-badge` classes that support both light and dark mode automatically.

---

### Task 2: Create Reusable `AppSidebar` and `AppHeader` Components
**Files:**
- Create: `src/components/app-sidebar.tsx`
- Create: `src/components/app-header.tsx`

**Step 1: Build `AppSidebar`**
Single unified sidebar navigation supporting both Patient and Clinician roles, workspace badges, unread indicators, and mode toggle.

**Step 2: Build `AppHeader`**
Single unified top header supporting page title, search bar, primary action button, theme toggle, notification bell, and profile menu.

---

### Task 3: Refactor Patient Dashboard (`src/features/dashboard/dashboard.tsx`)
**Files:**
- Modify: `src/features/dashboard/dashboard.tsx`

**Step 1: Integrate `AppSidebar` & `AppHeader` and apply `.gl-*` design tokens**

---

### Task 4: Refactor Clinician Dashboard (`src/features/clinical/clinician-dashboard.tsx`)
**Files:**
- Modify: `src/features/clinical/clinician-dashboard.tsx`

**Step 1: Remove hardcoded inline dark styles and integrate `AppSidebar` & `AppHeader`**
Ensure Clinician portal responds smoothly to dark/light mode toggle and uses identical card styles.

---

### Task 5: Verification & Tests
**Files:**
- Test: `npx tsc --noEmit` & `npx vitest run`

**Step 1: Execute type checking and unit test suite**
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx tsc --noEmit`
Run: `$env:PATH += ";C:\Program Files\nodejs"; npx vitest run`
Expected: 0 errors, all tests passing.
