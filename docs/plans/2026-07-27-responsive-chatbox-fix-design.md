# Design Document: Clinician Telehealth Chat Responsive Layout Fix

## Problem Root Cause
1. **Fixed Grid Columns:** `.messages-tab` used `grid-template-columns: 260px 1fr` without responsive breakpoints or min-width flex constraints.
2. **Flex Input Overflow:** `<input>` lacked `minWidth: 0`, preventing flex shrinking when the window resizes and pushing the `Send` button off-screen.
3. **Button Text Wrapping:** `✚ Prescribe Directive` button lacked `whiteSpace: "nowrap"` and `flexShrink: 0`, causing vertical text wrapping and button distortion.

---

## Solution
1. **Responsive CSS Media Queries (`src/app/clinical.css`):**
   Add `@media (max-width: 900px) { .messages-tab { grid-template-columns: 1fr; } }` and set `min-width: 0` on child columns.
2. **Flexbox Control Hardening (`src/features/clinical/clinician-dashboard.tsx`):**
   - Add `minWidth: 0`, `flex: 1` to message input field.
   - Add `whiteSpace: "nowrap"`, `flexShrink: 0` to `✚ Prescribe Directive` button and `Send` button.
   - Add `minWidth: 0`, `overflow: "hidden"` to the chat thread container column.
