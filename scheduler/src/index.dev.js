/**
 * Development Scheduler Entry Point
 * Uses MongoDB Memory Server for local development when real MongoDB is not available.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { startScheduler } = require('./workers/scheduler-worker');
const { schedulerIntervalMs } = require('./config/env');

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║    Nudge Scheduler (Development)     ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Job interval: ${schedulerIntervalMs}ms`);
  console.log('');

  let mongoServer;

  try {
    // Start MongoDB Memory Server
    console.log('[Scheduler] Starting MongoDB Memory Server...');
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'nudge-dev'
      }
    });

    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    console.log('[Scheduler] MongoDB Memory Server ready');

    await startScheduler(schedulerIntervalMs);
  } catch (error) {
    console.error('[Scheduler] Failed to start:', error.message);
    if (mongoServer) await mongoServer.stop();
    process.exit(1);
  }
}

main();