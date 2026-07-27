# Design Document: Dual-Side Chat Alignment Fix

## Problem Root Cause
- `POST /api/clinical/messages` assigned `senderRole` based strictly on `user.role`. When testing in Clinician Preview Mode, the logged-in user's database role was `PATIENT`, so all messages sent from both portals were saved as `senderRole: "PATIENT"`.
- As a result, both portals evaluated messages as coming from the patient, rendering all chat bubbles on the same left or right side.

---

## Solution
1. **Support `senderRole` in API Payload (`/api/clinical/messages`):**
   Allow `POST /api/clinical/messages` to accept `senderRole` ("DOCTOR" or "PATIENT") in the payload, defaulting to `DOCTOR` when called from Clinician Dashboard and `PATIENT` when called from Patient Dashboard.
2. **Explicit Chat Bubble Alignment:**
   - **Doctor Portal (`clinician-dashboard.tsx`):** `m.senderRole === "DOCTOR"` -> Right (`alignSelf: "flex-end"`), `m.senderRole === "PATIENT"` -> Left (`alignSelf: "flex-start"`).
   - **Patient Portal (`dashboard.tsx`):** `m.senderRole === "PATIENT"` -> Right (`alignSelf: "flex-end"`), `m.senderRole === "DOCTOR"` -> Left (`alignSelf: "flex-start"`).
