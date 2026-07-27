# Design Document: World-Class Medical Portal UI Overhaul

## Problem Analysis from Visual Feedback
The user provided a screenshot revealing severe layout degradation:
1. **Unstyled Raw Buttons:** Buttons (`Configure rules →`, `Review patient →`, `x`, `Generate draft summary`, `View all patients →`) rendered as unstyled browser white blocks with raw text.
2. **Text Overlaps & Squished Containers:** Alert headers merged with patient names (`Critical High GlucoseBimar ADMI`), missing margin and padding.
3. **Card Container Collapses:** Cards lost their background contrast, border radius, padding, and drop shadows, rendering dark text directly on dark green backgrounds.
4. **Navigation & Panel Broken Formatting:** Patient panel filter buttons (`All`, `Urgent`, `Review`) and search input squished together without proper spacing.

---

## Visual & Aesthetic Architecture

### 1. Dedicated, Pristine Styling Systems (`globals.css` & `clinical.css`)
- Re-architect `globals.css` for Patient Portal:
  - Clean card styling (`.glucose-card`, `.quick-card`, `.chart-card`, `.metric`, `.list-card`, `.care-card`).
  - Smooth rounded corners (`border-radius: 16px`), subtle borders (`1px solid #e2e8f0`), soft shadows (`0 4px 20px rgba(0,0,0,0.03)`).
- Re-architect `clinical.css` for Clinician Portal:
  - Full-featured clinical CSS rules for `.alert`, `.alert-severity`, `.alert-copy`, `.alert-action`, `.patient-panel`, `.patient-row`, `.ai-card`, `.filters button`, `.risk`.
  - Dark mode and light mode specific overrides (`[data-theme="dark"]`) so every text element, button, badge, and input field is crisp, readable, and perfectly aligned.

### 2. Button & Action Refactoring
- All buttons receive explicit CSS classes:
  - `.btn-primary`: Vibrant emerald/indigo action button with rounded corners and smooth hover glow.
  - `.btn-secondary` / `.btn-outline`: Subtle bordered button with transparent/subtle background.
  - `.btn-ghost` / `.btn-link`: Clean text link with hover underline.
  - `.btn-icon`: Circular/square icon button with centered alignment and crisp close icons (`×`).

### 3. Patient List & Alert Card Polish (`src/features/clinical/clinician-dashboard.tsx`)
- Proper flexbox alignment for alerts with distinct red/amber severity badges (`!`, `↗`).
- Clear spacing between alert title (`Critical High Glucose`) and patient name (`Bimar ADMI`).
- Beautiful AI Review Assistant banner (`.ai-card`) with rich gradient (`linear-gradient(135deg, #1e1b4b, #312e81)`), glowing icon, and aligned CTA button.
- Clean Patient Panel search input with magnifying glass and rounded filter chips.
