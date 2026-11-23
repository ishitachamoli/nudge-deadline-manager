/**
 * Process Due Reminders Job
 * Finds pending reminders that are due and creates notification logs for them.
 */

const { REMINDER_STATUS, NOTIFICATION_STATUS, SCHEDULER_JOB_TYPES } = require('@nudge/shared');

function logJobSummary(payload) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    job: SCHEDULER_JOB_TYPES.PROCESS_DUE_REMINDERS,
    ...payload
  }));
}

function buildIdempotencyKey(reminderId, scheduledAt, attempt = 0) {
  const isoTime = new Date(scheduledAt).toISOString();
  return `${reminderId}:${isoTime}:${attempt}`;
}

/**
 * Create notification logs for due reminders
 * @param {Object} Reminder - Mongoose Reminder model
 * @param {Object} NotificationLog - Mongoose NotificationLog model
 * @returns {Promise<{created: number, skipped: number, remindersProcessed: number, notificationsSent: number, retriesScheduled: number, failures: number}>}
 */
async function processDueReminders(Reminder, NotificationLog) {
  const startedAt = Date.now();
  const now = new Date();

  const dueReminders = await Reminder.find({
    status: REMINDER_STATUS.PENDING,
    dueDate: { $lte: now }
  }).select('_id dueDate title').lean();

  if (!dueReminders || dueReminders.length === 0) {
    const summary = {
      created: 0,
      skipped: 0,
      remindersProcessed: 0,
      notificationsSent: 0,
      retriesScheduled: 0,
      failures: 0,
      durationMs: Date.now() - startedAt
    };
    logJobSummary(summary);
    return summary;
  }

  let created = 0;
  let skipped = 0;
  let failures = 0;

  for (const reminder of dueReminders) {
    const scheduledAt = new Date(reminder.dueDate);
    const attempt = 0;
    const idempotencyKey = buildIdempotencyKey(reminder._id, scheduledAt, attempt);

    const existing = await NotificationLog.findOne({ idempotencyKey }).lean();
    if (existing) {
      skipped++;
      continue;
    }

    try {
      await NotificationLog.create({
        reminderId: reminder._id,
        scheduledAt,
        attemptedAt: null,
        status: NOTIFICATION_STATUS.PENDING,
        attemptCount: attempt,
        idempotencyKey,
        errorMessage: null,
        nextRetryAt: null
      });
      created++;
    } catch (err) {
      // Handle race condition / unique index duplicate key error idempotently
      if (err && (err.code === 11000 || /duplicate key/i.test(err.message || ''))) {
        skipped++;
      } else {
        failures++;
        throw err;
      }
    }
  }

  const summary = {
    created,
    skipped,
    remindersProcessed: dueReminders.length,
    notificationsSent: 0,
    retriesScheduled: 0,
    failures,
    durationMs: Date.now() - startedAt
  };

  logJobSummary(summary);
  return summary;
}

/**
 * Clean up stale pending notifications
 * @param {Object} NotificationLog - Mongoose model
 * @param {number} staleThresholdMs - Threshold in milliseconds
 * @returns {Promise<number>} Number of cleaned up notifications
 */
async function cleanupStaleNotifications(NotificationLog, staleThresholdMs = 5 * 60 * 1000) {
  const threshold = new Date(Date.now() - staleThresholdMs);

  const result = await NotificationLog.updateMany(
    {
      status: NOTIFICATION_STATUS.PENDING,
      createdAt: { $lt: threshold }
    },
    {
      status: NOTIFICATION_STATUS.FAILED,
      errorMessage: 'Stale notification - scheduler did not process in time',
      nextRetryAt: new Date(Date.now() + 60000)
    }
  );

  return result.modifiedCount;
}

module.exports = {
  processDueReminders,
  cleanupStaleNotifications,
  buildIdempotencyKey
};
