# Design Document: Universal CSS Button Reset & Layout Alignment Fix

## Problem Root Cause Analysis
From the screenshots provided:
1. **Default User-Agent 3D White Buttons:** Browser agent styles applied native 1990s white box borders to buttons (`View history →`, `Mark taken`, `•••`, and modal `×` close button).
2. **Modal Close Button & Eyebrow Collision:** Modal `.close` button (`×`) rendered as an unstyled 3D square box overlapping the `NEW READING` eyebrow text.
3. **Care Plan Card Alignment (`.care-card`):** `NEXT UP` pill and `•••` options button collided due to inline text placement without proper flex alignment.

---

## Universal Button Reset Strategy

### 1. Global CSS Button Reset (`src/app/globals.css`)
```css
button {
  font-family: inherit;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  color: inherit;
  font-size: inherit;
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
```
This guarantees that **no button in any portal or modal will ever fall back to browser default 3D white box styles**.

### 2. Modal Close Button (`.close`) Styling Reset
```css
.close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: 0;
  background: var(--bg-subtle);
  color: var(--text-muted);
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.close:hover {
  background: var(--border-color);
  color: var(--text-heading);
}
```

### 3. Care Card (`.care-card`) & List Card (`.list-card`) Refactoring
- Add `.btn-link` class for `View history →`.
- Add `.btn-pill` for `Mark taken` / `Completed ✓`.
- Add explicit flex container for `.care-top` (`NEXT UP` pill + `•••` options button).
