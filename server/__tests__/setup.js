/**
 * Jest Test Setup
 * Configures MongoDB Memory Server for testing
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Global setup - runs once before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'nudge-test'
    }
  });

  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri, {
    maxPoolSize: 10
  });
});

// Global teardown - runs once after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clean up database between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});