# Nudge — Database Schema & Persistence Architecture

**Database Engine:** MongoDB (Mongoose ODM v8)  
**Shared Contracts:** `@nudge/shared` (`shared/src/contracts/api-contracts.js`)

---

## 1. Collections Overview

| Collection | Model | Purpose |
| :--- | :--- | :--- |
| `reminders` | `Reminder` | Stores user deadlines, priority levels, categories, timezones, and lifecycle status. |
| `notificationlogs` | `NotificationLog` | Stores delivery attempts, idempotency keys, exponential backoff retry schedules, and audit metadata. |

---

## 2. `Reminder` Schema (`server/src/models/Reminder.js`)

### Fields
| Field | Type | Required | Default | Constraints / Validation |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Auto | Auto | Serialized as `id` (string) in `toJSON` / `toObject`. |
| `title` | `String` | Yes | — | Trimmed, 1–200 characters. |
| `description` | `String` | No | `""` | Trimmed, max 2000 characters. |
| `category` | `String` | No | `'other'` | Enum: `'personal'`, `'work'`, `'study'`, `'health'`, `'other'`. |
| `dueDate` | `Date` | Yes | — | Valid `Date`; must not be in the past when `isNew === true`. |
| `timezone` | `String` | No | `'UTC'` | Validated via `Intl.DateTimeFormat` IANA timezone check. |
| `priority` | `String` | No | `'medium'` | Enum: `'low'`, `'medium'`, `'high'`. |
| `status` | `String` | No | `'pending'` | Enum: `'pending'`, `'completed'`, `'cancelled'`. |
| `createdAt` | `Date` | Auto | `Date.now` | Managed by Mongoose `timestamps: true`. |
| `updatedAt` | `Date` | Auto | `Date.now` | Managed by Mongoose `timestamps: true`. |

### Indexes
| Index Definition | Type | Query Pattern Covered |
| :--- | :--- | :--- |
| `{ category: 1 }` | Single | Category filtering on dashboard. |
| `{ dueDate: 1 }` | Single | Chronological sorting and date range scans. |
| `{ priority: 1 }` | Single | Priority filtering. |
| `{ status: 1 }` | Single | Status counts (`getReminderStats`) and tab filtering. |
| `{ status: 1, dueDate: 1 }` | Compound | `findDueReminders()`, `findUpcoming()`, and `findOverdue()`. |
| `{ status: 1, priority: 1, dueDate: 1 }` | Compound | Filtered priority + due-date dashboard queries. |
| `{ status: 1, category: 1, dueDate: 1 }` | Compound | Category-scoped status tabs sorted by deadline. |
| `{ createdAt: -1 }` | Single | Recently created reminders feed. |

### Virtuals & Methods
* **Virtuals:**
  * `isOverdue` (`Boolean`): `true` when `status === 'pending'` and `dueDate < new Date()`.
  * `timeUntilDue` (`Number`): Milliseconds remaining until `dueDate` (negative if overdue).
  * `priorityRank` (`Number`): Numeric sort weight (`high = 3`, `medium = 2`, `low = 1`).
* **Instance Methods:** `markCompleted()`, `cancel()`, `reschedule(newDueDate, newTimezone)`
* **Static Methods:** `findDueReminders(beforeDate)`, `findUpcoming(limit)`, `findOverdue()`

---

## 3. `NotificationLog` Schema (`server/src/models/NotificationLog.js`)

### Fields
| Field | Type | Required | Default | Constraints / Validation |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Auto | Auto | Serialized as `id` (string). |
| `reminderId` | `ObjectId` | Yes | — | Foreign key reference (`ref: 'Reminder'`). |
| `scheduledAt` | `Date` | Yes | — | Target UTC delivery timestamp. |
| `attemptedAt` | `Date` | No | `null` | Timestamp of latest delivery attempt. |
| `status` | `String` | No | `'pending'` | Enum: `'pending'`, `'sent'`, `'failed'`, `'cancelled'`. |
| `attemptCount` | `Number` | No | `0` | Integer `0` to `MAX_RETRY_ATTEMPTS` (`3`). |
| `idempotencyKey` | `String` | Yes | — | Unique key (`reminderId:scheduledAt`), max 256 chars. |
| `errorMessage` | `String` | No | `null` | Failure reason (max 1000 chars). |
| `nextRetryAt` | `Date` | No | `null` | Next scheduled exponential backoff retry time. |
| `deliveryMetadata` | `Mixed` | No | `{}` | Provider response / latency debug payload. |

### Indexes
| Index Definition | Type | Query Pattern Covered |
| :--- | :--- | :--- |
| `{ idempotencyKey: 1 }` | **Unique** | Prevents duplicate notification creation across worker restarts. |
| `{ reminderId: 1 }` | Single | Lookup notification history for a reminder. |
| `{ status: 1, nextRetryAt: 1 }` | Compound | `findDueForRetry()` background worker polling. |
| `{ reminderId: 1, status: 1 }` | Compound | Cancelling pending/failed notifications on reminder reschedule/delete. |
| `{ createdAt: -1 }` | Single | Notification history log table ordering. |

### Virtuals & Methods
* **Virtual:** `canRetry` (`Boolean`) — `status === 'failed' && attemptCount < MAX_RETRY_ATTEMPTS && nextRetryAt <= now`.
* **Instance Methods:** `markSent(metadata)`, `markFailed(errorMessage, nextRetryAt)`, `cancel()`, `incrementAttempt()`
* **Static Methods:** `createIdempotent(data)`, `findPendingForReminder(reminderId)`, `findDueForRetry(maxAttempts)`, `findStalePending(thresholdMs)`

---

## 4. Maintenance & Migration

Run the idempotent backfill and index synchronization script against any persistent MongoDB instance:
```bash
MONGODB_URI="mongodb://localhost:27017/nudge" node server/scripts/migrate.js