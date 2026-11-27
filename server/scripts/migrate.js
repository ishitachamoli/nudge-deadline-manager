/**
 * One-time Idempotent Data Migration Script
 * Backfills missing fields, normalizes enums, and ensures indexes are built.
 *
 * Usage:
 *   MONGODB_URI="mongodb://localhost:27017/nudge" node server/scripts/migrate.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Reminder = require('../src/models/Reminder');
const NotificationLog = require('../src/models/NotificationLog');
const {
  REMINDER_STATUS,
  REMINDER_PRIORITY,
  REMINDER_CATEGORY,
  NOTIFICATION_STATUS
} = require('@nudge/shared');

async function migrate(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is required to run migration');
  }

  const shouldDisconnect = mongoose.connection.readyState === 0;
  if (shouldDisconnect) {
    await mongoose.connect(uri);
  }

  try {
    console.log('[migrate] Starting database migration...');

    // 1. Backfill missing timezone on Reminders
    const timezoneResult = await Reminder.updateMany(
      { $or: [{ timezone: { $exists: false } }, { timezone: null }, { timezone: '' }] },
      { $set: { timezone: 'UTC' } }
    );

    // 2. Backfill missing description on Reminders
    const descriptionResult = await Reminder.updateMany(
      { $or: [{ description: { $exists: false } }, { description: null }] },
      { $set: { description: '' } }
    );

    // 3. Normalize invalid or missing category/priority/status
    const categoryResult = await Reminder.updateMany(
      { category: { $nin: Object.values(REMINDER_CATEGORY) } },
      { $set: { category: REMINDER_CATEGORY.OTHER } }
    );

    const priorityResult = await Reminder.updateMany(
      { priority: { $nin: Object.values(REMINDER_PRIORITY) } },
      { $set: { priority: REMINDER_PRIORITY.MEDIUM } }
    );

    const statusResult = await Reminder.updateMany(
      { status: { $nin: Object.values(REMINDER_STATUS) } },
      { $set: { status: REMINDER_STATUS.PENDING } }
    );

    // 4. Backfill missing attemptCount / deliveryMetadata on NotificationLogs
    const attemptResult = await NotificationLog.updateMany(
      { $or: [{ attemptCount: { $exists: false } }, { attemptCount: null }] },
      { $set: { attemptCount: 0 } }
    );

    const metadataResult = await NotificationLog.updateMany(
      { $or: [{ deliveryMetadata: { $exists: false } }, { deliveryMetadata: null }] },
      { $set: { deliveryMetadata: {} } }
    );

    const notifStatusResult = await NotificationLog.updateMany(
      { status: { $nin: Object.values(NOTIFICATION_STATUS) } },
      { $set: { status: NOTIFICATION_STATUS.PENDING } }
    );

    // 5. Sync Mongoose indexes
    await Promise.all([Reminder.syncIndexes(), NotificationLog.syncIndexes()]);

    const summary = {
      remindersUpdated: {
        timezone: timezoneResult.modifiedCount,
        description: descriptionResult.modifiedCount,
        category: categoryResult.modifiedCount,
        priority: priorityResult.modifiedCount,
        status: statusResult.modifiedCount
      },
      notificationLogsUpdated: {
        attemptCount: attemptResult.modifiedCount,
        deliveryMetadata: metadataResult.modifiedCount,
        status: notifStatusResult.modifiedCount
      },
      indexesSynced: true
    };

    console.log('[migrate] Migration complete:', JSON.stringify(summary, null, 2));
    return summary;
  } finally {
    if (shouldDisconnect) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrate };