/**
 * Scheduler Entry Point
 * Independent process that runs scheduled jobs for notification delivery.
 * Can be started separately from the API server.
 */

require('dotenv').config();
const { startScheduler } = require('./workers/scheduler-worker');
const { schedulerIntervalMs } = require('./config/env');

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║       Nudge Scheduler Starting       ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Job interval: ${schedulerIntervalMs}ms`);
  console.log('');

  try {
    await startScheduler(schedulerIntervalMs);
  } catch (error) {
    console.error('[Scheduler] Failed to start:', error.message);
    process.exit(1);
  }
}

main();