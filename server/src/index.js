/**
 * Server Entry Point
 * Initializes and starts the Express application.
 */

require('dotenv').config();
const { startServer } = require('./app');

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║         Nudge API Server             ║');
  console.log('╚═══════════════════════════════════════╝');

  try {
    await startServer();
  } catch (error) {
    console.error('[Server] Failed to start:', error.message);
    process.exit(1);
  }
}

main();