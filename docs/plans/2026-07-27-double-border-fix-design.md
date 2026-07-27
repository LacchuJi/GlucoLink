# Design Document: Double Border Elimination & Equal Height Cards

## Root Cause
- **Double Border under Recent Readings:** `.card-title` defined a `border-bottom: 1px solid var(--border-color)` while `.reading-row` defined a `border-top: 1px solid var(--border-color)`, resulting in two parallel lines rendered 14px apart under the section header.
- **Card Height Misalignment:** `.care-card` did not fill vertical flex space, causing the `Mark taken` footer button to float at an unequal height relative to `.list-card`.

---

## Solution
1. **Remove `.card-title` Border-Bottom:** Allow `.reading-row`'s `border-top` to serve as the single divider line.
2. **Equal Height Cards:** Set `.care-card` to `display: flex; flex-direction: column; justify-content: space-between;` so `.care-footer` aligns at the bottom of the grid container (`margin-top: auto`).
