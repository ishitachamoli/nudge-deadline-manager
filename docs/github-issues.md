# Nudge Project - GitHub Issues for Team Members

This document contains prepared GitHub issues for each team member based on the project architecture and current implementation status.

---

## 🎨 Frontend Lead (React + Vite)

### Issue 1: Dashboard UI Polish & Responsive Design
**Labels:** `frontend`, `ui`, `priority:high`
**Assignee:** Frontend Lead

**Description:**
The dashboard is functional but needs visual polish and responsive improvements.

**Tasks:**
- [ ] Implement proper loading skeletons for reminder table and notification history
- [ ] Add empty states with illustrations for "no reminders" and "no notifications"
- [ ] Improve mobile responsiveness - stack cards vertically on < 768px
- [ ] Add keyboard navigation support (Tab, Enter, Escape for modal)
- [ ] Implement proper focus management in modal (trap focus, restore on close)
- [ ] Add toast notifications for create/update/delete/complete actions
- [ ] Polish form validation inline messages (show on blur, clear on input)

**Acceptance Criteria:**
- Dashboard looks polished on desktop (1920px), tablet (768px), and mobile (375px)
- All interactions have visual feedback
- Keyboard-only navigation works for all features
- Accessibility audit passes (axe-core, no critical violations)

---

### Issue 2: Reminder Form Enhancements
**Labels:** `frontend`, `forms`, `priority:high`
**Assignee:** Frontend Lead

**Description:**
Enhance the reminder create/edit modal with better UX.

**Tasks:**
- [ ] Add date/time picker component (flatpickr or native `<input type="datetime-local">` with polyfill)
- [ ] Add timezone selector with search (use Intl.supportedValuesOf('timeZone'))
- [ ] Show relative time preview ("Due in 2 hours", "Tomorrow at 3 PM")
- [ ] Add character count for title (200 max) and description (2000 max)
- [ ] Implement auto-save draft to localStorage (restore on reopen)
- [ ] Add confirmation dialog for unsaved changes when closing modal

**Acceptance Criteria:**
- Date/time picker works across browsers
- Timezone defaults to user's local timezone
- Form validates before submit (client-side + server errors displayed)
- Draft persists across browser sessions

---

### Issue 3: Notification History & Real-time Updates
**Labels:** `frontend`, `notifications`, `priority:medium`
**Assignee:** Frontend Lead

**Description:**
Build out the notification history panel and add real-time feel.

**Tasks:**
- [ ] Implement notification history table with sorting/filtering
- [ ] Add status badges with colors (sent=green, failed=red, pending=yellow)
- [ ] Show retry count and last attempt timestamp
- [ ] Add "Retry Failed" button that calls POST /api/notifications/retry
- [ ] Implement polling for notification updates (every 30s) or SSE
- [ ] Add pagination for notification history

**Acceptance Criteria:**
- Notification history loads and displays correctly
- Failed notifications can be retried from UI
- Auto-refresh works without manual reload
- Large datasets handled with pagination

---

### Issue 4: Dashboard Statistics & Visualizations
**Labels:** `frontend`, `charts`, `priority:medium`
**Assignee:** Frontend Lead

**Description:**
Enhance the stats cards with charts and better data visualization.

**Tasks:**
- [ ] Add mini chart for "Reminders by Status" (doughnut chart)
- [ ] Add "Reminders by Category" bar chart
- [ ] Add "Upcoming vs Overdue" trend line (last 7 days)
- [ ] Use a lightweight chart library (Chart.js, Recharts, or uPlot)
- [ ] Make charts responsive and accessible (ARIA labels, keyboard nav)

**Acceptance Criteria:**
- Three charts render correctly with current data
- Charts update when data changes
- Colorblind-friendly palette used
- Charts work on mobile (horizontal scroll or stacked)

---

### Issue 5: Theme & Design System
**Labels:** `frontend`, `design-system`, `priority:low`
**Assignee:** Frontend Lead

**Description:**
Establish a consistent design system and add dark mode.

**Tasks:**
- [ ] Extract CSS custom properties into design tokens (colors, spacing, typography, shadows, radii)
- [ ] Implement dark mode toggle (persist in localStorage, respect system preference)
- [ ] Create reusable component primitives (Button, Input, Select, Card, Modal, Badge, Table)
- [ ] Add Storybook for component documentation
- [ ] Document design tokens in `docs/design-tokens.md`

**Acceptance Criteria:**
- Dark/light mode toggles instantly without flash
- All components use design tokens (no hardcoded values)
- Storybook runs and documents all primitives
- Design tokens documented for team reference

---

## 🗄️ Database Lead (MongoDB + Mongoose)

### Issue 1: Index Optimization & Query Performance
**Labels:** `database`, `performance`, `priority:high`
**Assignee:** Database Lead

**Description:**
Analyze and optimize database indexes based on actual query patterns.

**Tasks:**
- [ ] Run `explain()` on all service queries (listReminders, findDueReminders, findUpcoming, findOverdue, getReminderStats)
- [ ] Verify compound indexes are used: `{ status: 1, dueDate: 1 }`, `{ status: 1, priority: 1, dueDate: 1 }`
- [ ] Add partial indexes for common filters (e.g., `status: PENDING` only)
- [ ] Consider TTL index for NotificationLog (auto-cleanup after 90 days)
- [ ] Document index strategy in `docs/database-indexes.md`

**Acceptance Criteria:**
- All queries use indexes (no COLLSCAN in explain output)
- Index size documented and reasonable
- TTL index removes old notification logs automatically
- Index strategy documented for future reference

---

### Issue 2: Data Validation & Constraints
**Labels:** `database`, `validation`, `priority:high`
**Assignee:** Database Lead

**Description:**
Strengthen data integrity at the database level.

**Tasks:**
- [ ] Add MongoDB schema validation rules (bsonType, enum, required) as backup to Mongoose
- [ ] Implement unique constraint on idempotencyKey in NotificationLog
- [ ] Add check constraint: dueDate cannot be in the past for new PENDING reminders (optional, soft warning)
- [ ] Add pre-save hooks for data normalization (trim strings, normalize timezone)
- [ ] Document validation strategy in `docs/data-validation.md`

**Acceptance Criteria:**
- Schema validation rejects invalid documents at DB level
- IdempotencyKey uniqueness enforced by unique index
- Data normalization happens consistently
- Validation approach documented

---

### Issue 3: Aggregation Pipelines for Analytics
**Labels:** `database`, `analytics`, `priority:medium`
**Assignee:** Database Lead

**Description:**
Build efficient aggregation pipelines for dashboard statistics.

**Tasks:**
- [ ] Create aggregation for "Reminders by Status" (single pipeline, all counts)
- [ ] Create aggregation for "Reminders by Category" with counts
- [ ] Create aggregation for "Upcoming vs Overdue trend" (last 30 days, daily buckets)
- [ ] Create aggregation for "Notification success rate by channel"
- [ ] Add static methods to models: `getStatsAggregation()`, `getCategoryBreakdown()`, `getTrendData(days)`
- [ ] Benchmark aggregation vs multiple countDocuments calls

**Acceptance Criteria:**
- All aggregations return correct data in single round-trip
- Performance better than multiple queries (benchmark documented)
- Methods added to models and tested
- Results match current getReminderStats output

---

### Issue 4: Migration Strategy & Seed Data
**Labels:** `database`, `migrations`, `priority:medium`
**Assignee:** Database Lead

**Description:**
Establish migration workflow and development seed data.

**Tasks:**
- [ ] Set up migration tool (migrate-mongo or custom)
- [ ] Create initial migration (current schema version)
- [ ] Write migration for any schema changes (add indexes, modify fields)
- [ ] Create seed script for development (`npm run db:seed`)
- [ ] Seed data: 50 reminders across categories/statuses/priorities, 100 notification logs
- [ ] Document migration workflow in `docs/database-migrations.md`

**Acceptance Criteria:**
- Migration tool configured and working
- Seed script creates realistic test data
- Team can run `npm run db:seed` for fresh dev database
- Migration workflow documented

---

### Issue 5: Backup, Monitoring & Maintenance
**Labels:** `database`, `ops`, `priority:low`
**Assignee:** Database Lead

**Description:**
Prepare for production database operations.

**Tasks:**
- [ ] Document backup strategy (frequency, retention, restore procedure)
- [ ] Add MongoDB Atlas / self-hosted monitoring alerts (connections, memory, disk, slow queries)
- [ ] Create maintenance script for index rebuild, stats update
- [ ] Document connection pooling settings for production
- [ ] Plan for schema evolution (additive changes, deprecation strategy)

**Acceptance Criteria:**
- Backup/restore procedure tested and documented
- Monitoring alerts configured
- Maintenance scripts ready
- Production connection settings documented

---

## ⏰ Scheduler Lead (Worker Process + Notifications)

### Issue 1: Notification Channel Implementations
**Labels:** `scheduler`, `notifications`, `priority:high`
**Assignee:** Scheduler Lead

**Description:**
Implement actual notification delivery channels (currently stubbed).

**Tasks:**
- [ ] Implement Email channel (Nodemailer with SMTP, template system)
- [ ] Implement Push channel (Web Push protocol, VAPID keys, service worker integration)
- [ ] Implement In-App channel (already works via NotificationLog, add real-time via SSE/Socket.io)
- [ ] Add channel configuration via environment variables
- [ ] Create channel abstraction: `NotificationChannel` interface with `send(reminder, notificationLog)`
- [ ] Add channel-specific retry logic (email: 3 retries, push: 2 retries, in-app: 1 retry)

**Acceptance Criteria:**
- All three channels send notifications successfully
- Templates support reminder data interpolation
- Channel failures logged with details for debugging
- Configuration via env vars (no hardcoded credentials)

---

### Issue 2: Retry Logic & Dead Letter Queue
**Labels:** `scheduler`, `reliability`, `priority:high`
**Assignee:** Scheduler Lead

**Description:**
Hardening the retry mechanism with exponential backoff and DLQ.

**Tasks:**
- [ ] Implement exponential backoff: `delay = BASE_RETRY_DELAY_MS * 2^attempt + jitter`
- [ ] Add MAX_RETRY_ATTEMPTS=3 (from shared constants)
- [ ] Create Dead Letter Queue collection for permanently failed notifications
- [ ] Add DLQ monitoring: alert when DLQ grows beyond threshold
- [ ] Implement manual replay from DLQ (admin endpoint)
- [ ] Add circuit breaker for failing channels (pause if > 50% fail in 5min)

**Acceptance Criteria:**
- Retries follow exponential backoff with jitter
- Failed notifications move to DLQ after max attempts
- DLQ visible and queryable via API
- Circuit breaker prevents cascade failures

---

### Issue 3: Scheduler Reliability & Observability
**Labels:** `scheduler`, `observability`, `priority:high`
**Assignee:** Scheduler Lead

**Description:**
Make scheduler production-ready with health checks, metrics, and graceful shutdown.

**Tasks:**
- [ ] Add health check endpoint (GET /health on scheduler if HTTP, or separate port)
- [ ] Implement structured logging (JSON format, correlation IDs)
- [ ] Add metrics: jobs processed, notifications sent/failed, queue lag, processing time
- [ ] Implement graceful shutdown (SIGTERM: finish current job, stop accepting new)
- [ ] Add leader election if running multiple instances (MongoDB-based lock)
- [ ] Document deployment architecture in `docs/scheduler-deployment.md`

**Acceptance Criteria:**
- Health check returns scheduler status and last job run
- Metrics exported (Prometheus format or statsd)
- Graceful shutdown tested and working
- Leader election prevents duplicate job execution
- Deployment guide complete

---

### Issue 4: Timezone-Aware Scheduling
**Labels:** `scheduler`, `timezone`, `priority:medium`
**Assignee:** Scheduler Lead

**Description:**
Ensure reminders fire at correct local time for user's timezone.

**Tasks:**
- [ ] Store reminder dueDate in UTC, timezone separately
- [ ] Scheduler query: find reminders where `dueDate <= now` in UTC
- [ ] But notification delivery should respect user's timezone for "time until due" display
- [ ] Add test cases for DST transitions, timezone offsets
- [ ] Document timezone handling in `docs/timezone-handling.md`

**Acceptance Criteria:**
- Reminders fire at correct UTC time regardless of server timezone
- User sees correct local time in notifications
- DST transitions handled correctly (tested)
- Timezone logic documented

---

### Issue 5: Batch Processing & Rate Limiting
**Labels:** `scheduler`, `performance`, `priority:medium`
**Assignee:** Scheduler Lead

**Description:**
Optimize scheduler for high volume with batching and rate limiting.

**Tasks:**
- [ ] Process due reminders in batches (configurable batch size, default 100)
- [ ] Add rate limiter per channel (email: 10/sec, push: 50/sec)
- [ ] Implement parallel processing within batch (Promise.allSettled)
- [ ] Add backpressure: pause polling if queue processing > 30s
- [ ] Benchmark with 10k pending reminders
- [ ] Document scaling strategy in `docs/scheduler-scaling.md`

**Acceptance Criteria:**
- Batch processing configurable and tested
- Rate limits enforced per channel
- Backpressure prevents memory issues
- Benchmark results documented
- Scaling guide for team

---

## 🔧 Backend Lead (API + Business Logic) - Already Mostly Complete

### Issue 1: API Documentation & OpenAPI Spec
**Labels:** `backend`, `documentation`, `priority:medium`
**Assignee:** Backend Lead

**Description:**
Generate and maintain OpenAPI/Swagger documentation.

**Tasks:**
- [ ] Add swagger-jsdoc annotations to routes/controllers
- [ ] Generate OpenAPI spec at build time
- [ ] Serve Swagger UI at `/api/docs` in development
- [ ] Document all endpoints: reminders CRUD, notifications, health
- [ ] Add request/response examples
- [ ] Integrate with CI to validate spec

**Acceptance Criteria:**
- Swagger UI accessible and accurate
- All endpoints documented with examples
- Spec validated in CI pipeline

---

### Issue 2: Authentication & Authorization (Future)
**Labels:** `backend`, `auth`, `priority:low`
**Assignee:** Backend Lead

**Description:**
Prepare for multi-user support with authentication.

**Tasks:**
- [ ] Design user model and auth strategy (JWT, sessions)
- [ ] Add userId to Reminder and NotificationLog schemas
- [ ] Implement auth middleware (verify token, attach user)
- [ ] Add ownership checks (users only access their reminders)
- [ ] Plan for API keys for server-to-server (scheduler)
- [ ] Document auth architecture in `docs/auth-design.md`

**Acceptance Criteria:**
- Auth design documented and reviewed
- Schema changes ready for migration
- Middleware structure in place

---

### Issue 3: Rate Limiting & Security Hardening
**Labels:** `backend`, `security`, `priority:medium`
**Assignee:** Backend Lead

**Description:**
Harden API against abuse and attacks.

**Tasks:**
- [ ] Review current rate limiting (100 req/15min per IP)
- [ ] Add stricter limits for write endpoints (create/update/delete: 30/min)
- [ ] Implement request size limits
- [ ] Add CORS configuration for production domains
- [ ] Security headers review (helmet config)
- [ ] Add input sanitization for XSS prevention
- [ ] Document security measures in `docs/security.md`

**Acceptance Criteria:**
- Rate limits appropriate for each endpoint type
- Security headers pass security scan
- CORS configured for production
- Security documentation complete

---

## 📋 Cross-Cutting Issues

### Issue: CI/CD Pipeline Setup
**Labels:** `devops`, `ci-cd`, `priority:high`
**Assignee:** All (shared responsibility)

**Tasks:**
- [ ] GitHub Actions workflow for: lint, test, build (all workspaces)
- [ ] Run tests on PR with mongodb-memory-server
- [ ] Build and push Docker images for server, scheduler, client
- [ ] Deploy preview environments for PRs
- [ ] Automated dependency updates (Dependabot)
- [ ] Code coverage reporting (Codecov or similar)

### Issue: End-to-End Testing
**Labels:** `testing`, `e2e`, `priority:medium`
**Assignee:** Frontend + Backend

**Tasks:**
- [ ] Set up Playwright or Cypress for E2E tests
- [ ] Test critical flows: create reminder → wait for notification → complete
- [ ] Test scheduler integration (mock time or use test clock)
- [ ] Run E2E in CI on preview deployments

### Issue: Production Deployment Guide
**Labels:** `devops`, `deployment`, `priority:high`
**Assignee:** All

**Tasks:**
- [ ] Document infrastructure requirements (MongoDB, Node.js, reverse proxy)
- [ ] Create docker-compose.yml for production
- [ ] Environment variable reference for all services
- [ ] SSL/TLS setup (Let's Encrypt, reverse proxy)
- [ ] Monitoring stack (Prometheus + Grafana or managed)
- [ ] Log aggregation (ELK, Loki, or managed)
- [ ] Runbook for common operations

---

## 📦 Shared Package - For All Leads

### Issue: Shared Contracts Maintenance
**Labels:** `shared`, `contracts`, `priority:high`
**Assignee:** All (coordinated)

**Description:**
Keep shared types, schemas, and constants in sync across workspaces.

**Tasks:**
- [ ] Add Zod schemas for all API request/response bodies
- [ ] Export TypeScript types from JSDoc (or migrate to .d.ts)
- [ ] Add validation helpers: `validateReminderCreate()`, `validateReminderUpdate()`
- [ ] Version shared package independently (semver)
- [ ] Document breaking change process
- [ ] Automated sync check in CI (ensure server/client/scheduler use same versions)

**Acceptance Criteria:**
- All workspaces consume @nudge/shared without duplication
- Zod schemas validate at boundaries
- Version bump process documented
- CI catches version mismatches

---

## 🎯 Priority Summary

| Priority | Frontend | Database | Scheduler | Backend | Shared |
|----------|----------|----------|-----------|---------|--------|
| **High** | Dashboard UI, Forms | Indexes, Validation | Channels, Retry, Reliability | - | Contracts |
| **Medium** | Notifications, Charts | Aggregations, Migrations | Timezone, Batching | Docs, Security | - |
| **Low** | Theme, Design System | Backup, Monitoring | - | Auth | - |

---

## 📝 How to Create Issues

1. Go to GitHub repository → Issues → New Issue
2. Use the appropriate template or "Blank issue"
3. Copy title, labels, and description from above
4. Assign to the appropriate team member
5. Add to the "Phase B" or "Phase C" project board/milestone
6. Link related issues (e.g., scheduler channels ↔ backend notification routes)

---

*Generated from Nudge project architecture. Update as implementation evolves.*