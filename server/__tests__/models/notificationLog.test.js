const Reminder = require('../../src/models/Reminder');
const NotificationLog = require('../../src/models/NotificationLog');
const { NOTIFICATION_STATUS, MAX_RETRY_ATTEMPTS } = require('@nudge/shared');

let sampleReminder;

beforeAll(async () => {
  await Promise.all([Reminder.syncIndexes(), NotificationLog.syncIndexes()]);
});

beforeEach(async () => {
  sampleReminder = await Reminder.create({
    title: 'Test Reminder',
    dueDate: new Date(Date.now() + 60000)
  });
});

describe('NotificationLog Model Integration Tests', () => {
  test('enforces unique idempotencyKey via createIdempotent', async () => {
    const key = `${sampleReminder.id}:${sampleReminder.dueDate.getTime()}`;
    const first = await NotificationLog.createIdempotent({
      reminderId: sampleReminder._id,
      scheduledAt: sampleReminder.dueDate,
      idempotencyKey: key
    });

    const duplicate = await NotificationLog.createIdempotent({
      reminderId: sampleReminder._id,
      scheduledAt: sampleReminder.dueDate,
      idempotencyKey: key
    });

    expect(duplicate.id).toBe(first.id);
    expect(await NotificationLog.countDocuments()).toBe(1);
  });

  test('supports retry lifecycle, canRetry virtual, and findDueForRetry', async () => {
    const log = await NotificationLog.create({
      reminderId: sampleReminder._id,
      scheduledAt: sampleReminder.dueDate,
      idempotencyKey: `${sampleReminder.id}:retry-test`
    });

    await log.incrementAttempt();
    await log.markFailed('Simulated network timeout', new Date(Date.now() - 1000));

    expect(log.status).toBe(NOTIFICATION_STATUS.FAILED);
    expect(log.attemptCount).toBe(1);
    expect(log.canRetry).toBe(true);

    const dueRetries = await NotificationLog.findDueForRetry(MAX_RETRY_ATTEMPTS);
    expect(dueRetries).toHaveLength(1);
    expect(dueRetries[0].id).toBe(log.id);

    await log.markSent({ provider: 'console', latencyMs: 12 });
    expect(log.status).toBe(NOTIFICATION_STATUS.SENT);
    expect(log.canRetry).toBe(false);
    expect(log.nextRetryAt).toBeNull();
  });

  test('verifies unique idempotencyKey and compound retry indexes exist', async () => {
    const indexes = await NotificationLog.collection.indexes();
    const idempotencyIdx = indexes.find(idx => idx.key.idempotencyKey === 1);
    expect(idempotencyIdx).toBeDefined();
    expect(idempotencyIdx.unique).toBe(true);

    const indexKeys = indexes.map(idx => Object.keys(idx.key).join(','));
    expect(indexKeys).toEqual(
      expect.arrayContaining(['status,nextRetryAt', 'reminderId,status'])
    );
  });
});