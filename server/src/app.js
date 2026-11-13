/**
 * Express Application Configuration
 * Creates and configures the Express app with middleware, routes, and error handling.
 * Separated from server startup for testability.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { port, corsOrigin, nodeEnv } = require('./config/env');
const { connectDB, isHealthy } = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware');
const reminderRoutes = require('./routes/reminder-routes');
const notificationRoutes = require('./routes/notification-routes');
const { API_ROUTES } = require('@nudge/shared');

/**
 * Create and configure Express application
 * @returns {express.Application}
 */
function createApp() {
  const app = express();

  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
  const corsOptions = {
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  app.use(cors(corsOptions));

  // Request logging
  if (nodeEnv !== 'test') {
    app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Health check endpoint (before rate limiting for monitoring)
  app.get(API_ROUTES.HEALTH, (req, res) => {
    const dbHealthy = isHealthy();
    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: nodeEnv,
      database: dbHealthy ? 'connected' : 'disconnected'
    });
  });

  // API Routes
  app.use(API_ROUTES.REMINDERS, reminderRoutes);
  app.use(API_ROUTES.NOTIFICATIONS, notificationRoutes);

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

/**
 * Start the server with database connection
 * @returns {Promise<http.Server>}
 */
async function startServer() {
  await connectDB();
  const app = createApp();

  const server = app.listen(port, () => {
    console.log(`[Server] Running on port ${port} (${nodeEnv})`);
    console.log(`[Server] Health check: http://localhost:${port}${API_ROUTES.HEALTH}`);
    console.log(`[Server] API base: http://localhost:${port}${API_ROUTES.REMINDERS}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[Server] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed');
      const { disconnectDB } = require('./config/db');
      await disconnectDB();
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

module.exports = {
  createApp,
  startServer
};