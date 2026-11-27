const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');

const { processDueReminders, buildIdempotencyKey } = require('../src/jobs/process-due-reminders');
const { retryFailedNotifications, getBackoffDelayMs } = require('../src/jobs/retry-failed-notifications');
const { BASE_RETRY_DELAY_MS, MAX_RETRY_ATTEMPTS, NOTIFICATION_STATUS } = require('@nudge/shared');

describe('processDueReminders', () => {
  it('creates notification with reminderId:scheduledAt:attempt key and skips duplicates', async () => {
    const dueDate = new Date('2026-11-23T10:00:00.000Z');
    const reminderId = 'rem-123';
    const expectedKey = buildIdempotencyKey(reminderId, dueDate, 0);
    assert.equal(expectedKey, 'rem-123:2026-11-23T10:00:00.000Z:0');

    const createdDocs = [];
    const seenKeys = new Set();

    const Reminder = {
      find: () => ({
        select: () => ({
          lean: async () => [{ _id: reminderId, dueDate, title: 'Submit tax doc' }]
        })
      })
    };

            const NotificationLog = {
      findOne: ({ idempotencyKey }) => ({
        lean: async () => (seenKeys.has(idempotencyKey) ? { idempotencyKey } : null)
      }),
      create: async (doc) => {
        seenKeys.add(doc.idempotencyKey);
        createdDocs.push(doc);
        return doc;
      }
    };



    const firstRun = await processDueReminders(Reminder, NotificationLog);
    assert.equal(firstRun.created, 1);
    assert.equal(firstRun.skipped, 0);
    assert.equal(createdDocs[0].idempotencyKey, expectedKey);

    const secondRun = await processDueReminders(Reminder, NotificationLog);
    assert.equal(secondRun.created, 0);
    assert.equal(secondRun.skipped, 1);
    assert.equal(createdDocs.length, 1);
  });
});

describe('retryFailedNotifications', () => {
  it('computes exponential backoff BASE_RETRY_DELAY_MS * 2^attemptCount and caps at MAX_RETRY_ATTEMPTS', async () => {
    assert.equal(getBackoffDelayMs(0), BASE_RETRY_DELAY_MS * 1);
    assert.equal(getBackoffDelayMs(1), BASE_RETRY_DELAY_MS * 2);
    assert.equal(getBackoffDelayMs(2), BASE_RETRY_DELAY_MS * 4);
    assert.equal(MAX_RETRY_ATTEMPTS, 3);

    const docAtMax = {
      _id: 'notif-1',
      status: NOTIFICATION_STATUS.FAILED,
      attemptCount: MAX_RETRY_ATTEMPTS - 1,
      nextRetryAt: new Date(Date.now() - 1000),
      save: mock.fn(async () => {})
    };

    const NotificationLog = {
      find: async () => [docAtMax]
    };

    const res = await retryFailedNotifications(NotificationLog);
    assert.equal(res.processed, 1);
    assert.equal(docAtMax.attemptCount, MAX_RETRY_ATTEMPTS);
    assert.equal(docAtMax.nextRetryAt, null);
    assert.equal(docAtMax.status, NOTIFICATION_STATUS.FAILED);
  });
});
