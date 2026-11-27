/**
 * Scheduler Worker
 * Coordinates and runs the scheduled jobs at defined intervals.
 */

const { connectDB, disconnectDB, getConnection } = require('../config/db');
const { processDueReminders, cleanupStaleNotifications } = require('../jobs/process-due-reminders');
const { retryFailedNotifications } = require('../jobs/retry-failed-notifications');
const { SCHEDULER_JOB_TYPES, NOTIFICATION_STATUS, MAX_RETRY_ATTEMPTS } = require('@nudge/shared');

const workerState = {
  lastRun: null,
  lastCatchUpAt: null,
  lastError: null
};

/**
 * Load models from server package to ensure consistency
 * @returns {Promise<{Reminder, NotificationLog}>}
 */
async function loadModels() {
  const conn = getConnection();
  const serverModels = require('server/src/models');

  let { Reminder, NotificationLog } = serverModels;

  if (conn && conn.readyState === 1) {
    if (!Reminder.db || Reminder.db.readyState !== 1) {
      const modelName = Reminder.modelName || 'Reminder';
      Reminder = conn.models[modelName] || conn.model(modelName, Reminder.schema);
    }
    if (!NotificationLog.db || NotificationLog.db.readyState !== 1) {
      const modelName = NotificationLog.modelName || 'NotificationLog';
      NotificationLog = conn.models[modelName] || conn.model(modelName, NotificationLog.schema);
    }
  }

  return { Reminder, NotificationLog };
}


/**
 * Run catch-up for reminders that became due while scheduler was down
 * @param {Object} models - { Reminder, NotificationLog }
 */
async function runCatchUp({ Reminder, NotificationLog }) {
  const startedAt = new Date().toISOString();
  const catchUpResult = await processDueReminders(Reminder, NotificationLog);
  workerState.lastCatchUpAt = startedAt;
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'scheduler_startup_catchup',
    catchUpResult
  }));
  return catchUpResult;
}

/**
 * Run a single job cycle
 * @param {Object} models - { Reminder, NotificationLog }
 * @returns {Promise<Object>} Results from all jobs
 */
async function runJobCycle({ Reminder, NotificationLog }) {
  const cycleStartedAt = new Date().toISOString();
  const results = {};

  // Job 1: Process due reminders
  try {
    results[SCHEDULER_JOB_TYPES.PROCESS_DUE_REMINDERS] = await processDueReminders(Reminder, NotificationLog);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      job: SCHEDULER_JOB_TYPES.PROCESS_DUE_REMINDERS,
      status: 'error',
      error: error.message
    }));
    results[SCHEDULER_JOB_TYPES.PROCESS_DUE_REMINDERS] = { error: error.message };
  }

  // Job 2: Retry failed notifications
  try {
    results[SCHEDULER_JOB_TYPES.RETRY_FAILED_NOTIFICATIONS] = await retryFailedNotifications(NotificationLog);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      job: SCHEDULER_JOB_TYPES.RETRY_FAILED_NOTIFICATIONS,
      status: 'error',
      error: error.message
    }));
    results[SCHEDULER_JOB_TYPES.RETRY_FAILED_NOTIFICATIONS] = { error: error.message };
  }

  // Job 3: Cleanup stale notifications
  try {
    results[SCHEDULER_JOB_TYPES.CLEANUP_STALE_JOBS] = await cleanupStaleNotifications(NotificationLog);
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      job: SCHEDULER_JOB_TYPES.CLEANUP_STALE_JOBS,
      status: 'error',
      error: error.message
    }));
    results[SCHEDULER_JOB_TYPES.CLEANUP_STALE_JOBS] = { error: error.message };
  }

  workerState.lastRun = {
    startedAt: cycleStartedAt,
    completedAt: new Date().toISOString(),
    results
  };

  return results;
}

/**
 * Get health status including DB connectivity, last run, and queue depth
 * @param {Object} [models] - Optional { Reminder, NotificationLog }
 */
async function getHealthStatus(models) {
  const conn = getConnection();
  const readyState = conn ? conn.readyState : 0;
  const dbConnected = readyState === 1;

  let pendingCount = 0;
  let retryableCount = 0;

  if (dbConnected && models && models.NotificationLog) {
    [pendingCount, retryableCount] = await Promise.all([
      models.NotificationLog.countDocuments({ status: NOTIFICATION_STATUS.PENDING }),
      models.NotificationLog.countDocuments({
        status: NOTIFICATION_STATUS.FAILED,
        attemptCount: { $lt: MAX_RETRY_ATTEMPTS }
      })
    ]);
  }

  return {
    status: dbConnected ? 'ok' : 'degraded',
    service: 'scheduler',
    db: {
      connected: dbConnected,
      readyState
    },
    lastRun: workerState.lastRun,
    lastCatchUpAt: workerState.lastCatchUpAt,
    queueDepth: {
      pending: pendingCount,
      retryable: retryableCount,
      total: pendingCount + retryableCount
    }
  };
}

/**
 * Start the scheduler worker
 * @param {number} intervalMs - Interval between job cycles
 * @param {Function} [onReady] - Optional callback receiving { models }
 */
async function startScheduler(intervalMs = 60000, onReady) {
  console.log('[Scheduler] Starting scheduler worker...');

  await connectDB();
  const models = await loadModels();

  if (typeof onReady === 'function') {
    onReady({ models });
  }

  // Catch-up run on startup for overdue reminders missed while down
  await runCatchUp(models);

  console.log(`[Scheduler] Running job cycle every ${intervalMs}ms`);

  // Run initial full cycle after startup catch-up
  await runJobCycle(models);

  // Set up interval
  const intervalId = setInterval(async () => {
    try {
      await runJobCycle(models);
    } catch (error) {
      workerState.lastError = error.message;
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
  runCatchUp,
  loadModels,
  getHealthStatus
};
