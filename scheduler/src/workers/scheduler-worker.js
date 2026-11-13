/**
 * Scheduler Worker
 * Coordinates and runs the scheduled jobs at defined intervals.
 */

const { connectDB, disconnectDB } = require('../config/db');
const { processDueReminders, cleanupStaleNotifications } = require('../jobs/process-due-reminders');
const { retryFailedNotifications } = require('../jobs/retry-failed-notifications');
const { SCHEDULER_JOB_TYPES } = require('@nudge/shared');

/**
 * Load models from server package to ensure consistency
 * @returns {Promise<{Reminder, NotificationLog}>}
 */
async function loadModels() {
  // Import models from server package to avoid schema duplication
  const { Reminder, NotificationLog } = require('server/src/models');
  return { Reminder, NotificationLog };
}

/**
 * Run a single job cycle
 * @param {Object} models - { Reminder, NotificationLog }
 * @returns {Promise<Object>} Results from all jobs
 */
async function runJobCycle({ Reminder, NotificationLog }) {
  const results = {};

  // Job 1: Process due reminders
  try {
    results[SCHEDULER_JOB_TYPES.PROCESS_DUE_REMINDERS] = await processDueReminders(Reminder, NotificationLog);
  } catch (error) {
    console.error('[Scheduler] process-due-reminders job failed:', error.message);
    results[SCHEDULER_JOB_TYPES.PROCESS_DUE_REMINDERS] = { error: error.message };
  }

  // Job 2: Retry failed notifications
  try {
    results[SCHEDULER_JOB_TYPES.RETRY_FAILED_NOTIFICATIONS] = await retryFailedNotifications(NotificationLog);
  } catch (error) {
    console.error('[Scheduler] retry-failed-notifications job failed:', error.message);
    results[SCHEDULER_JOB_TYPES.RETRY_FAILED_NOTIFICATIONS] = { error: error.message };
  }

  // Job 3: Cleanup stale notifications
  try {
    results[SCHEDULER_JOB_TYPES.CLEANUP_STALE_JOBS] = await cleanupStaleNotifications(NotificationLog);
  } catch (error) {
    console.error('[Scheduler] cleanup-stale-jobs job failed:', error.message);
    results[SCHEDULER_JOB_TYPES.CLEANUP_STALE_JOBS] = { error: error.message };
  }

  return results;
}

/**
 * Start the scheduler worker
 * @param {number} intervalMs - Interval between job cycles
 */
async function startScheduler(intervalMs = 60000) {
  console.log('[Scheduler] Starting scheduler worker...');

  await connectDB();
  const models = await loadModels();

  console.log(`[Scheduler] Running job cycle every ${intervalMs}ms`);

  // Run immediately on startup
  await runJobCycle(models);

  // Set up interval
  const intervalId = setInterval(async () => {
    try {
      await runJobCycle(models);
    } catch (error) {
      console.error('[Scheduler] Job cycle error:', error.message);
    }
  }, intervalMs);

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[Scheduler] Received ${signal}, shutting down...`);
    clearInterval(intervalId);
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return intervalId;
}

module.exports = {
  startScheduler,
  runJobCycle,
  loadModels
};