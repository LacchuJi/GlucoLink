# Design Document: Pixel-Perfect Layout & Visual Component Overhaul

## Detailed Bug Findings & Solutions

### 1. Patient Dashboard `.list-card` Header (`src/app/globals.css` & `src/features/dashboard/dashboard.tsx`)
- **Bug:** `View history →` was rendering directly on top of the card's top border line.
- **Solution:** Wrap `.list-card` internal content properly with padding (`24px`). Ensure `.card-title` uses a flexbox layout (`justify-content: space-between`) with a clean `border-bottom: 1px solid var(--border-color)` and `padding-bottom: 14px`.

### 2. Clinician Priority Queue Header & Rules Button (`src/features/clinical/clinician-dashboard.tsx`)
- **Bug:** `Configure rules →` floated directly under the `MONITORING GAPS` card, touching the patient panel.
- **Solution:** Move `Configure rules →` inside `.title-row` next to `Priority queue` heading in a flex container.

### 3. Patient Row Spacing (`src/features/clinical/clinician-dashboard.tsx`)
- **Bug:** Patient reading values (`145mg/dL`) and `REVIEW` risk badges were jammed together without space.
- **Solution:** Add right margin (`marginRight: "12px"`) to `.patient-reading` and space out value and unit (`145 mg/dL`).

### 4. Clinician Stat Grid Cleanup across Tabs (`src/features/clinical/clinician-dashboard.tsx`)
- **Bug:** The 4 top stats cards rendered on `patients`, `alerts`, `messages`, `reports`, and `settings` tabs, causing vertical clutter and pushing main tab content off screen.
- **Solution:** Render `.clinical-stats` ONLY on `activeTab === "overview"`.

### 5. Patient Grid Layout & RPM Reports (`src/features/clinical/clinician-dashboard.tsx`)
- **Bug:** Cards in `patients` tab were cramped on the left, and RPM Report download buttons floated at card bottoms.
- **Solution:** Standardize card padding (`20px`), background (`var(--bg-card)`), border radius (`var(--radius-lg)`), and button placement.
