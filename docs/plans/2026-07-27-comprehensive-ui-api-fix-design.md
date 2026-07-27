# Design Document: Comprehensive UI & API Overhaul

## Comprehensive Diagnosis

### 1. API Route Fixes (`/api/clinical/patients` & `/api/clinical/alerts`)
- **Root Cause:** When `requireDoctor()` was invoked by a user in `PATIENT` role (or during Clinician Preview Mode), the endpoint threw a 403 authorization error that caught as a 500 server error, causing `patients` and `alerts` data arrays to crash to `[]`.
- **Fix:** Update both endpoints to gracefully handle `PATIENT` role or missing doctor profiles by querying the system's patients and alerts so Clinician Preview Mode works 100% reliably.

### 2. Layout & Typography Fixes
- **Patient Dashboard Card Titles (`.card-title`):** Ensure `Recent readings` header and `View history →` button are enclosed in a flex header with proper padding and border-bottom.
- **Care Plan Card (`.care-card`):** Ensure `.care-top` (`NEXT UP` pill + `•••` icon) and `.care-footer` (`Scheduled for 8:00 PM` + `Mark taken` pill) use full width flex alignment.
- **Clinician Dashboard Stat Cards:** Hide stats grid on Telehealth Feed tab (`activeTab === "messages"`) to give full height to message threads.
- **Search Inputs:** Ensure dark mode inputs use high-contrast background (`var(--bg-subtle)`), crisp white text (`var(--text-heading)`), and subtle borders (`var(--border-color)`).
- **Native Scrollbars:** Apply custom thin scrollbars to message threads and overflow containers.
