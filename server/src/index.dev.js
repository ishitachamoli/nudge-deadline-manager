/**
 * Development Server Entry Point
 * Uses MongoDB Memory Server for local development when real MongoDB is not available.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { startServer } = require('./app');

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║     Nudge API Server (Development)   ║');
  console.log('╚═══════════════════════════════════════╝');

  let mongoServer;

  try {
    // Start MongoDB Memory Server
    console.log('[Server] Starting MongoDB Memory Server...');
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'nudge-dev'
      }
    });

    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    console.log('[Server] MongoDB Memory Server ready');

    await startServer();
  } catch (error) {
    console.error('[Server] Failed to start:', error.message);
    if (mongoServer) await mongoServer.stop();
    process.exit(1);
  }
}

main();