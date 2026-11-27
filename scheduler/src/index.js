/**
 * Scheduler Entry Point
 * Independent process that runs scheduled jobs for notification delivery.
 * Can be started separately from the API server.
 */

require('dotenv').config();
const http = require('http');
const { startScheduler, getHealthStatus } = require('./workers/scheduler-worker');
const { schedulerIntervalMs } = require('./config/env');

const HEALTH_PORT = parseInt(process.env.SCHEDULER_HEALTH_PORT || '3001', 10);

function startHealthServer(getModels) {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      try {
        const models = typeof getModels === 'function' ? getModels() : null;
        const health = await getHealthStatus(models);
        const statusCode = health.db.connected ? 200 : 503;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', error: err.message }));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(HEALTH_PORT, () => {
    console.log(`[Scheduler] Health endpoint listening on http://localhost:${HEALTH_PORT}/health`);
  });

  return server;
}

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║       Nudge Scheduler Starting       ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Job interval: ${schedulerIntervalMs}ms`);
  console.log('');

  let activeModels = null;
  startHealthServer(() => activeModels);

  try {
    await startScheduler(schedulerIntervalMs, ({ models }) => {
      activeModels = models;
    });
  } catch (error) {
    console.error('[Scheduler] Failed to start:', error.message);
    process.exit(1);
  }
}

main();
