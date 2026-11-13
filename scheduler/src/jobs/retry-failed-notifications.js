/**
 * Retry Failed Notifications Job
 * Processes notifications that have failed and are due for retry.
 */

const { NOTIFICATION_STATUS } = require('@nudge/shared');
const { processNotification } = require('../services/notification-service');

/**
 * Process failed notifications that are due for retry
 * @param {Object} NotificationLog - Mongoose model
 * @returns {Promise<{processed: number, succeeded: number, failed: number}>}
 */
async function retryFailedNotifications(NotificationLog) {
  const now = new Date();

  // Find failed notifications that have a nextRetryAt <= now
  const failedNotifications = await NotificationLog.find({
    status: NOTIFICATION_STATUS.FAILED,
    nextRetryAt: { $lte: now },
    attemptCount: { $lt: 3 } // MAX_RETRY_ATTEMPTS
  });

  if (failedNotifications.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const notification of failedNotifications) {
    const processed = await processNotification(notification, NotificationLog);

    if (processed.status === NOTIFICATION_STATUS.SENT) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return {
    processed: failedNotifications.length,
    succeeded,
    failed
  };
}

module.exports = {
  retryFailedNotifications
};