# Design Document: Neon PostgreSQL Integration & Premium Auth Page Overhaul

## 1. Neon PostgreSQL Integration
- **Database Connection:** Use Prisma PostgreSQL provider with Neon serverless connection string (`DATABASE_URL`).
- **Schema Push & Seed:** Ensure `User`, `Patient`, `Doctor`, `ChatMessage`, `Alert`, `Reading`, and `Session` tables are synced to Neon.

---

## 2. Premium Auth Page Redesign (`src/app/auth.css` & `src/app/sign-in/page.tsx`)
- **Theme Awareness:** Support full Light and Dark mode using CSS variables (`--bg-app`, `--bg-card`, `--accent-primary`).
- **Interactive Role Switcher:** Animated Patient 👤 vs Doctor 🩺 role toggle with active indicator pill.
- **Glassmorphism & Micro-animations:** Elevate card shadow, smooth input focus borders, and clean error alert banners.
- **Quick Demo Access:** Distinct 1-click Clinician and Patient demo login buttons.
