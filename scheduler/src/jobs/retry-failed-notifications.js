/**
 * Retry Failed Notifications Job
 * Processes notifications that have failed and are due for retry.
 */

const {
  NOTIFICATION_STATUS,
  MAX_RETRY_ATTEMPTS,
  BASE_RETRY_DELAY_MS,
  SCHEDULER_JOB_TYPES
} = require('@nudge/shared');
const { processNotification } = require('../services/notification-service');

function getBackoffDelayMs(attemptCount) {
  return BASE_RETRY_DELAY_MS * Math.pow(2, attemptCount);
}

function logRetrySummary(payload) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    job: SCHEDULER_JOB_TYPES.RETRY_FAILED_NOTIFICATIONS,
    ...payload
  }));
}

/**
 * Process failed notifications that are due for retry
 * @param {Object} NotificationLog - Mongoose model
 * @returns {Promise<{processed: number, succeeded: number, failed: number, retriesScheduled: number, durationMs: number}>}
 */
async function retryFailedNotifications(NotificationLog) {
  const startedAt = Date.now();
  const now = new Date();

  const failedNotifications = await NotificationLog.find({
    status: NOTIFICATION_STATUS.FAILED,
    nextRetryAt: { $lte: now },
    attemptCount: { $lt: MAX_RETRY_ATTEMPTS }
  });

  if (!failedNotifications || failedNotifications.length === 0) {
    const summary = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      retriesScheduled: 0,
      durationMs: Date.now() - startedAt
    };
    logRetrySummary(summary);
    return summary;
  }

  let succeeded = 0;
  let failed = 0;
  let retriesScheduled = 0;

  for (const notification of failedNotifications) {
    const currentAttempt = notification.attemptCount || 0;
    const processed = await processNotification(notification, NotificationLog);

    if (processed.status === NOTIFICATION_STATUS.SENT) {
      succeeded++;
    } else if ((processed.attemptCount || currentAttempt + 1) >= MAX_RETRY_ATTEMPTS) {
      processed.status = NOTIFICATION_STATUS.FAILED;
      processed.nextRetryAt = null;
      if (typeof processed.save === 'function') {
        await processed.save();
      }
      failed++;
    } else {
      const nextAttemptIndex = processed.attemptCount || (currentAttempt + 1);
      processed.nextRetryAt = new Date(Date.now() + getBackoffDelayMs(nextAttemptIndex));
      if (typeof processed.save === 'function') {
        await processed.save();
      }
      retriesScheduled++;
      failed++;
    }
  }

  const summary = {
    processed: failedNotifications.length,
    succeeded,
    failed,
    retriesScheduled,
    durationMs: Date.now() - startedAt
  };

  logRetrySummary(summary);
  return summary;
}

module.exports = {
  retryFailedNotifications,
  getBackoffDelayMs
};
