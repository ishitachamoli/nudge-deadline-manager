# Nudge Architecture Documentation

## Overview

Nudge is a reliable deadline scheduling and notification system built with a modular monorepo architecture. The system separates concerns into four independently deployable workspaces while maintaining shared contracts for type safety and consistency.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           NUDGE SYSTEM                              │
├──────────────┬──────────────┬──────────────┬──────────────────────┤
│   CLIENT     │   SERVER     │  SCHEDULER   │      SHARED          │
│  (React)     │  (Express)   │  (Worker)    │   (Contracts)        │
├──────────────┼──────────────┼──────────────┼──────────────────────┤
│ • Dashboard  │ • REST API   │ • Job Queue  │ • API Contracts      │
│ • Forms      │ • Validation │ • Retry Logic│ • Constants          │
│ • API Client │ • Business   │ • Idempotency│ • Response Helpers   │
│ • State Mgmt │   Logic      │ • Recovery   │ • Zod Schemas        │
└──────┬───────┴──────┬───────┴──────┬───────┴──────────┬───────────┘
       │              │              │                  │
       └──────────────┴──────┬────────┴─────────────────┘
                             │
                    ┌────────▼────────┐
                    │   MONGODB       │
                    │  (Shared Data)  │
                    └─────────────────┘
```

## Workspace Responsibilities

### 1. Client (`client/`)
- **Technology**: React 18 + Vite 5
- **Responsibilities**:
  - User interface for reminder management
  - Dashboard with upcoming/overdue/completed views
  - Create/edit/delete reminder forms
  - Notification history display
  - API integration via axios client
- **Port**: 5173 (dev), proxied to server on 3000
- **Ownership**: Member 2 (Frontend)

### 2. Server (`server/`)
- **Technology**: Node.js + Express 4 + Mongoose 8
- **Responsibilities**:
  - REST API for reminders and notifications
  - Request validation (Zod)
  - Business logic (service layer)
  - Database operations (Mongoose models)
  - Error handling & logging
  - Rate limiting & security headers
- **Port**: 3000
- **Ownership**: Member 1 (Backend/Team Lead)

### 3. Scheduler (`scheduler/`)
- **Technology**: Node.js + Mongoose (independent process)
- **Responsibilities**:
  - Periodic job execution (configurable interval)
  - Process due reminders → create notification logs
  - Retry failed notifications with exponential backoff
  - Cleanup stale pending notifications
  - Idempotency enforcement via unique keys
  - Graceful shutdown & restart recovery
- **Ownership**: Member 4 (Scheduler)

### 4. Shared (`shared/`)
- **Technology**: Plain JavaScript + JSDoc
- **Responsibilities**:
  - API contracts (constants, enums, types)
  - Response formatting helpers
  - Zod validation schemas (re-exported)
  - Shared constants across all workspaces
- **Ownership**: All members (contract changes require coordination)

## Data Models

### Reminder
```javascript
{
  _id: ObjectId,
  title: String (required, max 200),
  description: String (max 2000),
  category: Enum ['personal', 'work', 'study', 'health', 'other'],
  dueDate: Date (required, UTC),
  timezone: String (IANA timezone, default 'UTC'),
  priority: Enum ['low', 'medium', 'high'],
  status: Enum ['pending', 'completed', 'cancelled'],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ status: 1, dueDate: 1 }` - Query pending due reminders
- `{ status: 1, priority: 1, dueDate: 1 }` - Priority-aware queries
- `{ createdAt: -1 }` - Recent reminders

### NotificationLog
```javascript
{
  _id: ObjectId,
  reminderId: ObjectId (ref: Reminder),
  scheduledAt: Date (required, UTC),
  attemptedAt: Date (nullable),
  status: Enum ['pending', 'sent', 'failed', 'cancelled'],
  attemptCount: Number (default 0),
  idempotencyKey: String (unique, required),
  errorMessage: String (nullable),
  nextRetryAt: Date (nullable),
  deliveryMetadata: Mixed,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ reminderId: 1, status: 1 }` - Notifications for a reminder
- `{ status: 1, nextRetryAt: 1 }` - Due for retry
- `{ idempotencyKey: 1 }` (unique) - Duplicate prevention
- `{ createdAt: -1 }` - History queries

## API Contracts

### Base URL
```
Development: http://localhost:3000/api
Production:  https://api.nudge.example.com/api
```

### Reminders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reminders` | Create reminder |
| GET | `/reminders` | List reminders (paginated, filtered) |
| GET | `/reminders/stats` | Get statistics |
| GET | `/reminders/:id` | Get single reminder |
| PATCH | `/reminders/:id` | Update reminder |
| PATCH | `/reminders/:id/complete` | Mark completed |
| DELETE | `/reminders/:id` | Delete reminder |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications (paginated, filtered) |
| GET | `/notifications/:id` | Get single notification |
| GET | `/notifications/reminder/:reminderId` | Notifications for reminder |
| POST | `/notifications/:id/retry` | Retry failed notification |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (includes DB status) |

### Request/Response Format

**Success Response**:
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "meta": {}
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error description",
  "error": { "errors": [{ "field": "title", "message": "Title is required" }] }
}
```

## Scheduling Architecture

### Job Types

1. **Process Due Reminders** (runs every interval)
   - Finds reminders with `status: 'pending'` and `dueDate <= now`
   - Creates NotificationLog entries with unique `idempotencyKey`
   - Idempotency key: `${reminderId}:${scheduledAt.getTime()}`

2. **Retry Failed Notifications** (runs every interval)
   - Finds notifications with `status: 'failed'`, `attemptCount < 3`, `nextRetryAt <= now`
   - Simulates delivery (90% success rate)
   - On success: marks `sent`
   - On failure: increments `attemptCount`, schedules next retry with exponential backoff

3. **Cleanup Stale Notifications** (runs every interval)
   - Finds `pending` notifications older than 5 minutes
   - Marks as `failed` with retry in 1 minute

### Retry Strategy
- **Max attempts**: 3
- **Base delay**: 5 minutes
- **Backoff**: Exponential (5min, 10min, 20min)
- **Jitter**: None (deterministic for testing)

### Idempotency
- Unique compound key: `reminderId + scheduledAt`
- Enforced at database level (unique index)
- Scheduler uses `createIdempotent()` - returns existing if duplicate

### Restart Recovery
- Scheduler runs job cycle immediately on startup
- Pending notifications from before restart are processed
- Stale notifications cleaned up automatically
- No in-memory state - all state in MongoDB

## Database Connection Strategy

### Server Connection
- Pool size: 10
- Auto-index in development
- Reconnection handling
- Health check endpoint exposes connection status

### Scheduler Connection
- Pool size: 5 (lighter weight)
- Independent connection pool
- Same database, separate process
- Graceful shutdown on SIGTERM/SIGINT

### Ownership Boundaries
| Operation | Owner | Notes |
|-----------|-------|-------|
| Reminder CRUD | Server | Single source of truth |
| Notification creation | Scheduler | Via idempotent insert |
| Notification delivery | Scheduler | Simulated in job |
| Notification retry | Scheduler | Exponential backoff |
| Notification cancel | Server + Scheduler | Server cancels on reminder update/delete |
| Stale cleanup | Scheduler | Background job |

## Security Considerations

- Helmet.js for security headers
- CORS configured per environment
- Rate limiting (100 req/15min per IP)
- Request size limits (10kb)
- Input validation on all endpoints
- No sensitive data in logs
- Environment variables for secrets

## Error Handling

### Error Types
- `AppError` - Base operational error
- `NotFoundError` - 404
- `ValidationError` - 422 (Zod + Mongoose)
- `ConflictError` - 409 (duplicate key)

### Response Codes
- 200 - Success
- 201 - Created
- 400 - Bad Request
- 404 - Not Found
- 422 - Validation Error
- 409 - Conflict
- 429 - Too Many Requests
- 500 - Internal Server Error
- 503 - Service Unavailable (DB down)

## Deployment Considerations

### Development
```bash
# Terminal 1: Frontend + Backend
npm run dev

# Terminal 2: Scheduler (optional)
npm run dev:scheduler

# Or all three:
npm run dev:all
```

### Production
- Each workspace can be deployed independently
- Server and scheduler need MongoDB access
- Client builds to static files (`npm run build`)
- Scheduler runs as background worker
- Shared package published or linked locally

## Future Extensibility

### Adding Notification Channels
1. Extend `NotificationLog.deliveryMetadata` for channel-specific data
2. Add channel field to schema
3. Create delivery adapters in `scheduler/src/services/delivery/`
4. Update retry logic per channel

### Adding Recurring Reminders
1. Add `recurrence` field to Reminder (cron expression or rrule)
2. Scheduler creates next occurrence after completion
3. Handle timezone-aware recurrence

### Horizontal Scaling
- Scheduler: Use BullMQ + Redis for distributed job queue
- Server: Stateless, scale behind load balancer
- Database: MongoDB replica set

## Testing Strategy

### Unit Tests
- Service layer functions (reminder-service.js)
- Validation schemas
- Utility functions

### Integration Tests
- API endpoints (supertest)
- Database operations
- Scheduler job cycles

### E2E Tests
- Critical user flows
- API + Scheduler interaction

---

*Last updated: 2026-11-12*
*Version: 1.0*