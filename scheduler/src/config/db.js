/**
 * Scheduler MongoDB Connection
 * Establishes a separate connection for the scheduler process.
 * This runs independently from the API server but uses the same database.
 */

const mongoose = require('mongoose');
const { mongodbUri } = require('./env');

let isConnected = false;

/**
 * Connect to MongoDB with retry logic
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);

  const options = {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4
  };

  try {
    await mongoose.connect(mongodbUri, options);
    isConnected = true;
    console.log('[Scheduler] Connected to MongoDB');

    mongoose.connection.on('error', (err) => {
      console.error('[Scheduler] MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Scheduler] MongoDB disconnected');
      isConnected = false;
    });

    return mongoose.connection;
  } catch (error) {
    console.error('[Scheduler] MongoDB connection failed:', error.message);
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
    console.log('[Scheduler] Disconnected from MongoDB');
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  getConnection: () => mongoose.connection
};