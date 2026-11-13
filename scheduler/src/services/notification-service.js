/**
 * Scheduler Notification Service
 * Handles notification delivery simulation, retry logic, and status updates.
 * This service is used by the scheduler workers to process due notifications.
 */

const { NOTIFICATION_STATUS, MAX_RETRY_ATTEMPTS, BASE_RETRY_DELAY_MS } = require('@nudge/shared');

/**
 * Simulate notification delivery
 * In production, this would integrate with email, push, webhook, etc.
 * @param {Object} notification - The notification document
 * @returns {Promise<{success: boolean, errorMessage?: string}>}
 */
async function simulateDelivery(notification) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));

  // Simulate ~90% success rate
  const success = Math.random() > 0.1;

  if (success) {
    return { success: true };
  }

  return {
    success: false,
    errorMessage: 'Simulated delivery failure: network timeout'
  };
}

/**
 * Calculate next retry time with exponential backoff
 * @param {number} attemptCount - Current attempt number (1-based)
 * @returns {Date} Next retry timestamp
 */
function calculateNextRetry(attemptCount) {
  const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attemptCount - 1);
  return new Date(Date.now() + delay);
}

/**
 * Process a single notification
 * @param {Object} notification - Mongoose notification document
 * @param {Object} NotificationLog - Mongoose model
 * @returns {Promise<Object>} Updated notification
 */
async function processNotification(notification, NotificationLog) {
  const attemptCount = notification.attemptCount + 1;

  // Update to processing state
  notification.attemptCount = attemptCount;
  notification.attemptedAt = new Date();
  notification.status = NOTIFICATION_STATUS.PENDING; // Will be updated to SENT/FAILED

  try {
    const result = await simulateDelivery(notification);

    if (result.success) {
      notification.status = NOTIFICATION_STATUS.SENT;
      notification.errorMessage = null;
      notification.nextRetryAt = null;
    } else {
      // Check if we should retry
      if (attemptCount < MAX_RETRY_ATTEMPTS) {
        notification.status = NOTIFICATION_STATUS.FAILED;
        notification.errorMessage = result.errorMessage;
        notification.nextRetryAt = calculateNextRetry(attemptCount);
      } else {
        // Max retries exceeded
        notification.status = NOTIFICATION_STATUS.FAILED;
        notification.errorMessage = `${result.errorMessage} (max retries exceeded)`;
        notification.nextRetryAt = null;
      }
    }

    await notification.save();
    return notification;
  } catch (error) {
    // Handle unexpected errors
    notification.status = NOTIFICATION_STATUS.FAILED;
    notification.errorMessage = `Processing error: ${error.message}`;

    if (attemptCount < MAX_RETRY_ATTEMPTS) {
      notification.nextRetryAt = calculateNextRetry(attemptCount);
    } else {
      notification.nextRetryAt = null;
    }

    await notification.save();
    return notification;
  }
}

/**
 * Cancel pending notifications for a reminder
 * @param {string} reminderId - Reminder ID
 * @param {Object} NotificationLog - Mongoose model
 * @returns {Promise<number>} Number of cancelled notifications
 */
async function cancelPendingNotifications(reminderId, NotificationLog) {
  const result = await NotificationLog.updateMany(
    {
      reminderId,
      status: { $in: [NOTIFICATION_STATUS.PENDING, NOTIFICATION_STATUS.FAILED] }
    },
    {
      status: NOTIFICATION_STATUS.CANCELLED,
      nextRetryAt: null
    }
  );
  return result.modifiedCount;
}

module.exports = {
  simulateDelivery,
  calculateNextRetry,
  processNotification,
  cancelPendingNotifications,
  NOTIFICATION_STATUS,
  MAX_RETRY_ATTEMPTS,
  BASE_RETRY_DELAY_MS
};