/**
 * Scheduler Environment Configuration
 * Validates and exports all required environment variables for the scheduler process.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const requiredVars = [
  'MONGODB_URI',
  'SCHEDULER_INTERVAL_MS'
];

const optionalVars = [
  'NODE_ENV',
  'LOG_LEVEL'
];

function validateEnv() {
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateEnv();

module.exports = {
  mongodbUri: process.env.MONGODB_URI,
  schedulerIntervalMs: parseInt(process.env.SCHEDULER_INTERVAL_MS || '60000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info'
};