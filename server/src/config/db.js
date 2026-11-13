/**
 * Server MongoDB Connection
 * Establishes connection for the API server process.
 * Separate from scheduler connection to allow independent scaling.
 */

const mongoose = require('mongoose');
const { mongodbUri } = require('./env');

let isConnected = false;

/**
 * Connect to MongoDB with retry logic and proper configuration
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
    // Enable automatic index creation in development
    autoIndex: process.env.NODE_ENV !== 'production'
  };

  try {
    await mongoose.connect(mongodbUri, options);
    isConnected = true;
    console.log('[Server] Connected to MongoDB');

    mongoose.connection.on('error', (err) => {
      console.error('[Server] MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Server] MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Server] MongoDB reconnected');
      isConnected = true;
    });

    return mongoose.connection;
  } catch (error) {
    console.error('[Server] MongoDB connection failed:', error.message);
    throw error;
  }
}

/**
 * Gracefully close the database connection
 * @returns {Promise<void>}
 */
async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Server] Disconnected from MongoDB');
  }
}

/**
 * Check if database is connected
 * @returns {boolean}
 */
function isHealthy() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  disconnectDB,
  isHealthy,
  getConnection: () => mongoose.connection
};