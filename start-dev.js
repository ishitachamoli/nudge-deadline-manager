/**
 * Shared Development Startup
 * Starts one MongoDB Memory Server and runs both API server and scheduler against it.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

let mongoServer;
let serverProcess;
let schedulerProcess;

async function start() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║     Nudge Development Environment        ║');
  console.log('╚═══════════════════════════════════════════╝');

  try {
    // Start MongoDB Memory Server
    console.log('\n[Startup] Starting MongoDB Memory Server...');
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'nudge-dev'
      }
    });

    const uri = mongoServer.getUri();
    console.log(`[Startup] MongoDB Memory Server ready at ${uri}`);

    // Set environment variable for both processes
    process.env.MONGODB_URI = uri;
    process.env.NODE_ENV = 'development';

    // Start API Server
    console.log('\n[Startup] Starting API Server...');
    serverProcess = spawn('node', ['src/index.js'], {
      cwd: path.join(__dirname, 'server'),
      env: { ...process.env, MONGODB_URI: uri },
      stdio: 'inherit'
    });

    // Wait for server to be ready
    await waitForServer(3000, 30000);

    // Start Scheduler
    console.log('\n[Startup] Starting Scheduler...');
    schedulerProcess = spawn('node', ['src/index.js'], {
      cwd: path.join(__dirname, 'scheduler'),
      env: { ...process.env, MONGODB_URI: uri },
      stdio: 'inherit'
    });

    console.log('\n✅ Both processes started successfully!');
    console.log('   API Server: http://localhost:3000');
    console.log('   Health:     http://localhost:3000/health');
    console.log('   Scheduler:  Running job cycles every 60s\n');

    // Handle shutdown
    const shutdown = async (signal) => {
      console.log(`\n[Startup] Received ${signal}, shutting down...`);

      if (serverProcess) {
        serverProcess.kill('SIGTERM');
      }
      if (schedulerProcess) {
        schedulerProcess.kill('SIGTERM');
      }
      if (mongoServer) {
        await mongoServer.stop();
      }
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('[Startup] Failed:', error.message);
    await cleanup();
    process.exit(1);
  }
}

function waitForServer(port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const http = require('http');
      const req = http.get(`http://localhost:${port}/health`, (res) => {
        if (res.statusCode === 200) {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.status === 'ok') {
                console.log('[Startup] API Server is healthy');
                resolve();
                return;
              }
            } catch {}
          });
        }
        // Not ready yet, retry
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Timeout waiting for server'));
        } else {
          setTimeout(check, 500);
        }
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Timeout waiting for server'));
        } else {
          setTimeout(check, 500);
        }
      });
      req.setTimeout(2000, () => req.destroy());
    };
    check();
  });
}

async function cleanup() {
  if (serverProcess) serverProcess.kill('SIGTERM');
  if (schedulerProcess) schedulerProcess.kill('SIGTERM');
  if (mongoServer) await mongoServer.stop();
}

start();