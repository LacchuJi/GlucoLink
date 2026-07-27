# Design Document: Account, Login, and Workspace Switching Overhaul

## Overview
This document specifies the design for a comprehensive overhaul of GlucoLink's authentication, role-based onboarding, workspace routing, profile dropdown, and 1-click demo account switcher.

## System Architecture

```mermaid
graph TD
    SignInPage[Sign-In & Registration Page] --> RoleSelect{Role Selected}
    RoleSelect -->|PATIENT| RegisterPatient[Register + Create Patient Record]
    RoleSelect -->|DOCTOR| RegisterDoctor[Register + Create Org & Doctor Record]
    SignInPage --> QuickDemo[1-Click Demo Login Bar]
    QuickDemo -->|Doctor Demo| DemoDocSession[Session: doctor@glucolink.demo]
    QuickDemo -->|Patient Demo| DemoPatSession[Session: patient@glucolink.demo]

    DemoDocSession --> ClinicianDashboard[/clinician Dashboard]
    DemoPatSession --> PatientDashboard[/ Patient Dashboard]

    ProfileHeader[Top-Right Profile Menu Component] --> WorkspaceSwitch[Toggle Active Persona / Route]
```

## Functional Specifications

### 1. Dual-Role Registration & Smart Routing (`src/app/sign-in/page.tsx` & `src/app/api/onboarding/`)
- **Sign-Up Form:**
  - Includes role selector toggle buttons: `[ 👤 Patient ]` and `[ 🩺 Doctor / Clinician ]`.
  - When `Doctor` is selected, an additional input field appears for `Clinic / Practice Name` (default: "GlucoLink Care Clinic").
  - On submit:
    - Registers user via `authClient.signUp.email`.
    - If `PATIENT`: calls `POST /api/onboarding/patient`.
    - If `DOCTOR`: calls `POST /api/onboarding/doctor` passing clinic name.
- **Smart Redirect on Sign-In:**
  - Queries `GET /api/me` or session user role.
  - If `role === "DOCTOR"`: redirects to `/clinician`.
  - If `role === "PATIENT"`: redirects to `/`.

### 2. 1-Click Demo Account Switcher (`src/components/demo-accounts.tsx` & `/api/auth/demo`)
- Adds a prominent **"⚡ Quick Demo Login"** bar on the sign-in card:
  - **🩺 Sign in as Doctor (Dr. Sarah Adams)**
  - **👤 Sign in as Patient (Pawan / Demo Patient)**
- On click: calls `POST /api/auth/demo` which auto-provisions or logs in the demo account and sets active session cookies, instantly redirecting to the proper dashboard.

### 3. Profile Dropdown & Workspace Switcher Component (`src/components/profile-menu.tsx`)
- Renders an interactive dropdown menu on the top-right profile avatar (`ME` / `DR`) on both Patient and Clinician dashboards.
- Displays:
  - User name, email, and active role badge (**PATIENT** / **DOCTOR**).
  - Clinic name (if Doctor).
  - **⇄ Switch to Clinician Panel** (redirects to `/clinician`)
  - **⇄ Switch to Patient View** (redirects to `/`)
  - **⚙ Account Settings**
  - **🚪 Sign Out** (calls `authClient.signOut()` and redirects to `/sign-in`).

## Backend API Endpoints

### 1. `POST /api/onboarding/doctor`
- Accepts `{ clinicName?: string }`.
- Sets `user.role = "DOCTOR"`.
- Creates `Organization` (if needed) and `Doctor` record.

### 2. `POST /api/onboarding/patient`
- Sets `user.role = "PATIENT"`.
- Creates `Patient` record (if needed).

### 3. `POST /api/auth/demo`
- Accepts `{ role: "DOCTOR" | "PATIENT" }`.
- Auto-provisions demo users `doctor@glucolink.demo` and `patient@glucolink.demo` with preset data & care assignments if missing.
- Sets authenticated session cookies for immediate access.
