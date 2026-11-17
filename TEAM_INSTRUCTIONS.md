# Team Instructions — Nudge Cinematic Redesign Integration

**Date:** 2026-11-17  
**Project State:** Cinematic frontend deployed (React 18 + Vite + Motion + GSAP)  
**Branches:** Each member works on their assigned branch → PR to `main` → you review/merge

---

## 🎯 Current Architecture

```
MyNewNudge/
├── client/          # React 18 + Vite — CINEMATIC FRONTEND (NEW)
│   ├── src/
│   │   ├── App.jsx           # Main app with all cinematic sections
│   │   ├── styles/index.css  # Liquid glass, grain, tokens, motion
│   │   ├── components/       # React Bits components (BlurText, SpotlightCard, DepthCarousel, CountUp, GlareHover)
│   │   └── services/api.js   # Axios client → /api proxy
│   └── vite.config.js        # @nudge/shared alias, /api → localhost:3000 proxy
├── server/          # Express + Mongoose — API (EXISTING)
│   ├── src/
│   │   ├── models/Reminder.js  # Uses @nudge/shared constants
│   │   ├── routes/, controllers/, services/
│   │   └── config/env.js       # Validates MONGODB_URI, PORT
│   └── src/index.dev.js        # Starts MongoDB Memory Server
├── scheduler/       # Background jobs (EXISTING)
│   ├── src/jobs/
│   │   ├── process-due-reminders.js
│   │   └── retry-failed-notifications.js
│   └── src/workers/scheduler-worker.js
├── shared/          # CONTRACTS (single source of truth)
│   └── src/contracts/api-contracts.js
│       # Reminder, NotificationLog, ApiResponse, constants, routes
└── .env             # PORT=3000, MONGODB_URI (dev override)
```

---

## 👤 Ishmeet — Frontend (`feature/frontend`)

### **DO NOT** recreate the dashboard — it's done.
The new `client/src/App.jsx` already has:
- Hero with video + word-by-word blur headline + cursor spotlight
- Scroll story (3 framers)
- DepthCarousel (GSAP 3D) for featured reminders
- CountUp animated stats
- Liquid-glass tables with spotlight rows + GlareHover action buttons
- Tabbed panels (Upcoming/Overdue/Completed)
- Notification history table
- Liquid-glass create/edit modal

### **Your tasks — Polish & Connect:**

| Task | Details |
|------|---------|
| **API Integration** | `client/src/services/api.js` already calls `/api/reminders` and `/api/notifications`. Verify all CRUD flows work end-to-end with the running backend. |
| **Form Validation** | The modal uses `formErrors` state. Ensure Zod validation from backend returns proper 422 errors that map to field-level messages. |
| **Empty/Loading/Error States** | Already scaffolded in `App.jsx` (skeleton loaders, empty-state illustrations, toast errors). Polish copy and animations. |
| **Responsive** | CSS has breakpoints at 480/768/1024px. Test on mobile — the hero video, depth carousel, and tables must degrade gracefully. |
| **Accessibility** | Add `aria-labels`, ensure focus-visible outlines (`.button-focus-visible`), test keyboard nav on DepthCarousel. |
| **Performance** | Hero video is 1080p — add a mobile poster or lower-res source. Lazy-load DepthCarousel images. |

### **Branch workflow:**
```bash
git checkout -b feature/frontend
# Make changes in client/
git add client/
git commit -m "feat(frontend): polish cinematic UI — responsive, a11y, API integration"
git push origin feature/frontend
# Open PR → main
```

### **Key files you'll touch:**
- `client/src/App.jsx` — minor tweaks only
- `client/src/styles/index.css` — responsive polish
- `client/src/services/api.js` — error handling improvements
- `client/src/components/` — only if adding new UI pieces

---

## 👤 Harleen — Database (`feature/database`)

### **Current schema:** `server/src/models/Reminder.js` + `NotificationLog.js`
Both already use `@nudge/shared` constants (REMINDER_STATUS, REMINDER_PRIORITY, etc.).

### **Your tasks — Harden & Document:**

| Task | Details |
|------|---------|
| **Review Indexes** | Current: `category`, `dueDate`, `priority`, `status`, compound `(status, dueDate)`, `(status, priority, dueDate)`, `createdAt`. Verify these cover scheduler queries (`findDueReminders`, `findUpcoming`, `findOverdue`). Add if missing. |
| **NotificationLog Schema** | Check `server/src/models/NotificationLog.js` — ensure `idempotencyKey` has unique index, `nextRetryAt` indexed for retry job, `reminderId` ref is correct. |
| **Validation** | Mongoose enum validators use shared constants — good. Add custom validators if needed (e.g., `dueDate` not in past for new reminders). |
| **Data Migration Script** | Write a one-time script (`server/scripts/migrate.js`) to backfill any missing fields on existing docs (e.g., `priorityRank` virtual, `timezone` defaults). |
| **Schema Documentation** | Generate a Markdown doc (`docs/database-schema.md`) with: field table, index list, virtuals, methods, query patterns. |
| **Test Persistence** | Write integration tests (Jest + mongodb-memory-server) for CRUD, virtuals (`isOverdue`, `priorityRank`), statics (`findDueReminders`). |

### **Branch workflow:**
```bash
git checkout -b feature/database
# Make changes in server/src/models/, add tests in server/__tests__/
git add server/
git commit -m "feat(database): harden schemas, add indexes, docs, tests"
git push origin feature/database
# Open PR → main
```

### **Key files you'll touch:**
- `server/src/models/Reminder.js` — indexes, validators
- `server/src/models/NotificationLog.js` — indexes, validators
- `server/__tests__/models/` — new test files
- `docs/database-schema.md` — new documentation

---

## 👤 Navneet — Scheduler (`feature/scheduler`)

### **Current jobs:** `scheduler/src/jobs/`
- `process-due-reminders.js` — finds pending reminders due now, creates NotificationLog, "sends" (simulated)
- `retry-failed-notifications.js` — exponential backoff (base 5min × 2^attempt), max 3 retries

Both use `@nudge/shared` constants (`MAX_RETRY_ATTEMPTS`, `BASE_RETRY_DELAY_MS`, `NOTIFICATION_STATUS`).

### **Your tasks — Reliability & Observability:**

| Task | Details |
|------|---------|
| **Idempotency** | Verify `idempotencyKey` (format: `reminderId:scheduledAt:attempt`) prevents duplicates on scheduler restart or overlapping runs. |
| **Overdue Handling** | On startup, scheduler must process reminders that became due while it was down. Add a "catch-up" run in `scheduler-worker.js`. |
| **Reschedule Safety** | When a reminder is rescheduled (API `PATCH /reminders/:id`), any pending NotificationLog for old time must be cancelled (`status: 'cancelled'`). Add this in reminder service or controller. |
| **Retry Logic** | Confirm exponential backoff: `delay = BASE_RETRY_DELAY_MS * 2^attemptCount`. Max 3 attempts → then `status: 'failed'`. |
| **Logging/Metrics** | Add structured logs (JSON) for each job run: reminders processed, notifications sent, retries scheduled, failures. |
| **Health Endpoint** | Scheduler should expose `/health` (like server) showing last run, queue depth, DB connectivity. |
| **Tests** | Unit test `process-due-reminders.js` and `retry-failed-notifications.js` with mocked Reminder/NotificationLog models. |

### **Branch workflow:**
```bash
git checkout -b feature/scheduler
# Make changes in scheduler/src/
git add scheduler/
git commit -m "feat(scheduler): idempotency, catch-up, reschedule safety, metrics"
git push origin feature/scheduler
# Open PR → main
```

### **Key files you'll touch:**
- `scheduler/src/jobs/process-due-reminders.js`
- `scheduler/src/jobs/retry-failed-notifications.js`
- `scheduler/src/workers/scheduler-worker.js` — add catch-up run
- `server/src/services/reminder-service.js` — add notification cancellation on reschedule
- `scheduler/__tests__/` — new test files (create folder)

---

## 👤 Ishita — Backend/API & Integration (`feature/api`)

### **Your tasks — Own the Contract & Integration:**

| Task | Details |
|------|---------|
| **API Contract Review** | `shared/src/contracts/api-contracts.js` is the single source of truth. Ensure server routes, controller responses, and client `api.js` all conform. |
| **Validation Middleware** | `server/src/middleware/validate.js` uses Zod schemas. Keep schemas in sync with `api-contracts.js` types. |
| **Error Handling** | `server/src/middleware/errorHandler.js` must return `ApiResponse.error()` format. Frontend expects `{ success: false, message, error }`. |
| **CORS/Proxy** | `client/vite.config.js` proxies `/api` → `localhost:3000`. Verify `CORS_ORIGIN` in `.env` matches. |
| **E2E Integration Test** | Write a script (`scripts/e2e-test.js` or Cypress) that: creates reminder → appears in dashboard → completes → notification logged → retries work. |
| **Documentation** | Update `docs/architecture.md` with: data flow diagram, API spec, scheduler sequence, deployment notes. |
| **Release Checklist** | Before merge: build passes, tests pass, no console errors, responsive OK, scheduler catches up on restart. |

### **Branch workflow:**
```bash
git checkout -b feature/api
# Make changes in server/, shared/, docs/, client/ (only API integration)
git add .
git commit -m "feat(api): contract sync, validation, e2e tests, docs"
git push origin feature/api
# Open PR → main (self-review + merge after others approve)
```

### **Key files you'll touch:**
- `shared/src/contracts/api-contracts.js` — source of truth
- `server/src/middleware/validate.js` — Zod schemas
- `server/src/middleware/errorHandler.js` — response format
- `server/src/controllers/reminder-controller.js` — reschedule notification cancellation
- `docs/architecture.md` — updated
- `scripts/e2e-test.js` — new integration test

---

## 🔄 Coordination Rules (Non-Negotiable)

1. **Branch per person** — `feature/frontend`, `feature/database`, `feature/scheduler`, `feature/api` — **created from latest `main`**
2. **No direct commits to `main`** — all changes via PR
3. **PR template** — each PR must include: what changed, how tested, screenshots (frontend), test output (backend/scheduler/db)
4. **Shared contracts are immutable without discussion** — if you need a new field in `Reminder`, propose in `shared/` first, get Ishita approval, then all three update their modules.
5. **Test locally with full stack** — run all three: `client:dev` (5173), `server:dev:mem` (3000), `scheduler:dev` (runs `npm run dev` in scheduler/) before pushing.
6. **Demo day** — each member shows their module working end-to-end before final merge.

---

## 🚀 Quick Start for Each Member

```bash
# 1. Clone & install
git clone <repo>
cd MyNewNudge

# 2. Get the latest main (with cinematic frontend)
git fetch origin
git checkout main
git pull origin main

# 3. Create YOUR feature branch FROM main
git checkout -b feature/frontend    # Ishmeet
git checkout -b feature/database    # Harleen
git checkout -b feature/scheduler   # Navneet
# (Ishita uses feature/api)

# 4. Install deps (root has workspaces or do each folder)
cd client && npm install
cd ../server && npm install
cd ../scheduler && npm install
cd ../shared && npm install

# 5. Create .env from example
cp .env.example .env
# Edit .env if needed (PORT=3000, MONGODB_URI will be overridden by memory server)

# 6. Start all three (three terminals)
# Terminal 1 - Frontend
cd client && npm run dev
# → http://localhost:5173

# Terminal 2 - Backend API
cd server && npm run dev:mem
# → http://localhost:3000/health

# Terminal 3 - Scheduler (if separate process)
cd scheduler && npm run dev
# → runs scheduler/src/index.dev.js (MongoDB Memory Server + jobs)
# Or it runs embedded in server — check scheduler/src/workers/scheduler-worker.js
```

## 🔑 Key Branch Rule

> **Always create your branch from the latest `main`** (after Ishita pushes).
> ```bash
> git fetch origin
> git checkout -b feature/your-name origin/main
> ```
> This ensures you have the cinematic frontend baseline before you start.

---

## 📋 Definition of Done (Per Module)

| Module | Done When |
|--------|-----------|
| **Frontend** | Cinematic UI works on mobile/desktop, all CRUD flows complete, no console errors, a11y audit passes |
| **Database** | Indexes verified, schema doc generated, integration tests pass, migration script ready |
| **Scheduler** | Idempotent, catches up on restart, handles reschedule, retries with backoff, logs structured |
| **API/Integration** | Contracts synced, validation returns 422 with field errors, E2E test passes, docs current |

---

**You (Ishita) own the final merge.** Review each PR, run the full stack locally, verify the cinematic frontend talks to the hardened backend and scheduler. Then merge to `main` and tag a release.

---

*Generated from current project state. Update as modules evolve.*