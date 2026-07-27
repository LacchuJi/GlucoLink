# Design Document: Prescription Directives Visibility & Synchronization Fix

## Problem Root Cause
- When a doctor issues a Care Directive from the Clinician portal, the message is assigned to the active `targetPatientId`.
- In preview/testing mode, the logged-in user's patient profile (`patient.id`) differed from the selected demo patient ID (`cms1...`), causing directives sent by the doctor to be stored under a different thread and disappear when switching to Patient View.

---

## Solution
1. **Auto-Assign Logged-in Patient to Clinician Panel (`/api/clinical/patients`):**
   Ensure the logged-in patient user is automatically assigned to the clinician panel via `CareAssignment` so their profile appears in the Doctor's patient list.
2. **Dual-Thread Directive Persistence (`/api/clinical/messages`):**
   When `senderRole === "DOCTOR"` posts a Care Directive (`attachmentJson`), ensure the directive is written to both the target patient thread and the testing user's patient thread.
3. **Unified Message Retrieval:**
   Ensure `GET /api/clinical/messages` fetches messages for `patient.id` along with demo thread fallback so directives are 100% visible to patients at all times.
