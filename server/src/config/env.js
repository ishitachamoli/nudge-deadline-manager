/**
 * Server Environment Configuration
 * Validates and exports all required environment variables for the API server.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const requiredVars = [
  'MONGODB_URI',
  'PORT'
];

const optionalVars = [
  'NODE_ENV',
  'CORS_ORIGIN',
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
  port: parseInt(process.env.PORT || '3000', 10),
  mongodbUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  logLevel: process.env.LOG_LEVEL || 'info'
};