# Design Document: Layout Spacing & Section Breathing Room Fix

## Problem Root Cause
- **Stat Cards & Lower Grid Squishing:** `.lower-grid` lacked a `margin-top` CSS rule, causing the lower cards (`Recent readings` and `NEXT UP`) to render directly beneath the 4 stat cards (`.metrics`) with 0px spacing.
- **Card Subtitle Squishing:** `Evening Metformin` title and its dosage subtitle (`500 mg · Take with dinner`) lacked top/bottom margin separation.

---

## Solution
1. **Add Spacious Grid Margins:**
   Set `.lower-grid { margin-top: 28px; }` in `src/app/globals.css`.
2. **Improve Internal Card Spacing:**
   Add `margin-top: 6px` to `.care-card p` and increase `.care-top` margin to `16px`.
