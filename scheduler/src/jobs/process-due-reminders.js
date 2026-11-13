/**
 * Process Due Reminders Job
 * Finds reminders that are due and creates notification logs for them.
 * This job runs periodically to schedule notifications.
 */

const { REMINDER_STATUS, NOTIFICATION_STATUS } = require('@nudge/shared');

/**
 * Create notification logs for due reminders
 * @param {Object} Reminder - Mongoose Reminder model
 * @param {Object} NotificationLog - Mongoose NotificationLog model
 * @returns {Promise<{created: number, skipped: number}>}
 */
async function processDueReminders(Reminder, NotificationLog) {
  const now = new Date();

  // Find pending reminders that are due (dueDate <= now)
  const dueReminders = await Reminder.find({
    status: REMINDER_STATUS.PENDING,
    dueDate: { $lte: now }
  }).select('_id dueDate title').lean();

  if (dueReminders.length === 0) {
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;

  for (const reminder of dueReminders) {
    // Idempotency key: reminderId + scheduledAt (rounded to minute)
    const scheduledAt = reminder.dueDate;
    const idempotencyKey = `${reminder._id}:${scheduledAt.getTime()}`;

    // Check if notification already exists (idempotency)
    const existing = await NotificationLog.findOne({ idempotencyKey }).lean();

    if (existing) {
      skipped++;
      continue;
    }

    // Create notification log
    await NotificationLog.create({
      reminderId: reminder._id,
      scheduledAt,
      attemptedAt: null,
      status: NOTIFICATION_STATUS.PENDING,
      attemptCount: 0,
      idempotencyKey,
      errorMessage: null,
      nextRetryAt: null
    });

    created++;
  }

  return { created, skipped };
}

/**
 * Clean up stale pending notifications
 * Notifications that have been pending for too long without being processed
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
      nextRetryAt: new Date(Date.now() + 60000) // Retry in 1 minute
    }
  );

  return result.modifiedCount;
}

module.exports = {
  processDueReminders,
  cleanupStaleNotifications
};