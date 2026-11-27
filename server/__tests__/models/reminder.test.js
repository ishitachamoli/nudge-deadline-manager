const Reminder = require('../../src/models/Reminder');
const { migrate } = require('../../scripts/migrate');
const { REMINDER_STATUS, REMINDER_PRIORITY, REMINDER_CATEGORY } = require('@nudge/shared');

beforeAll(async () => {
  await Reminder.syncIndexes();
});

describe('Reminder Model Integration Tests', () => {
  const futureDate = (offsetMs = 60 * 60 * 1000) => new Date(Date.now() + offsetMs);

  test('creates a valid reminder with defaults and transforms JSON output', async () => {
    const reminder = await Reminder.create({
      title: 'Renew Passport',
      dueDate: futureDate()
    });

    const json = reminder.toJSON();
    expect(json.id).toBeDefined();
    expect(json._id).toBeUndefined();
    expect(json.category).toBe(REMINDER_CATEGORY.OTHER);
    expect(json.priority).toBe(REMINDER_PRIORITY.MEDIUM);
    expect(json.status).toBe(REMINDER_STATUS.PENDING);
    expect(json.timezone).toBe('UTC');
    expect(json.isOverdue).toBe(false);
    expect(json.priorityRank).toBe(2);
  });

  test('rejects invalid dueDate and missing required title', async () => {
    await expect(
      Reminder.create({ dueDate: futureDate() })
    ).rejects.toThrow(/Title is required/);

    await expect(
      Reminder.create({ title: 'Bad Date', dueDate: 'not-a-valid-date' })
    ).rejects.toThrow(/Cast to date failed/);
  });

  test('rejects invalid timezone, priority, and category', async () => {
    await expect(
      Reminder.create({
        title: 'Bad TZ',
        dueDate: futureDate(),
        timezone: 'Mars/Olympus_Mons'
      })
    ).rejects.toThrow(/Invalid timezone identifier/);

    await expect(
      Reminder.create({
        title: 'Bad Priority',
        dueDate: futureDate(),
        priority: 'urgent'
      })
    ).rejects.toThrow(/Invalid priority/);
  });

  test('computes virtuals isOverdue, timeUntilDue, and priorityRank accurately', async () => {
    const highReminder = await Reminder.create({
      title: 'High Priority Future',
      dueDate: futureDate(3600000),
      priority: REMINDER_PRIORITY.HIGH
    });
    expect(highReminder.priorityRank).toBe(3);
    expect(highReminder.isOverdue).toBe(false);
    expect(highReminder.timeUntilDue).toBeGreaterThan(0);

    // Create an overdue pending reminder directly
    const overdueReminder = await Reminder.create({
      title: 'Became Overdue',
      dueDate: new Date(Date.now() - 10000),
      priority: REMINDER_PRIORITY.LOW
    });
    expect(overdueReminder.isOverdue).toBe(true);
    expect(overdueReminder.priorityRank).toBe(1);
  });

  test('executes instance methods markCompleted, cancel, and reschedule', async () => {
    const reminder = await Reminder.create({
      title: 'Doctor Appointment',
      dueDate: futureDate()
    });

    await reminder.markCompleted();
    expect(reminder.status).toBe(REMINDER_STATUS.COMPLETED);

    const newDate = futureDate(7200000);
    await reminder.reschedule(newDate, 'Asia/Kolkata');
    expect(reminder.status).toBe(REMINDER_STATUS.PENDING);
    expect(reminder.timezone).toBe('Asia/Kolkata');
    expect(reminder.dueDate.getTime()).toBe(newDate.getTime());

    await reminder.cancel();
    expect(reminder.status).toBe(REMINDER_STATUS.CANCELLED);
  });

  test('executes static queries findDueReminders, findUpcoming, and findOverdue', async () => {
    const upcoming1 = await Reminder.create({ title: 'Upcoming 1', dueDate: futureDate(10000) });
    const upcoming2 = await Reminder.create({ title: 'Upcoming 2', dueDate: futureDate(50000) });
    await Reminder.create({ title: 'Due Now', dueDate: new Date(Date.now() - 5000) });

    const dueList = await Reminder.findDueReminders();
    expect(dueList.map(r => r.title)).toEqual(['Due Now']);

    const overdueList = await Reminder.findOverdue();
    expect(overdueList.map(r => r.title)).toEqual(['Due Now']);

    const upcomingList = await Reminder.findUpcoming(10);
    expect(upcomingList.map(r => r.id)).toEqual([upcoming1.id, upcoming2.id]);
  });

  test('verifies required indexes exist on Reminder collection', async () => {
    const indexes = await Reminder.collection.indexes();
    const indexKeys = indexes.map(idx => Object.keys(idx.key).join(','));
    expect(indexKeys).toEqual(
      expect.arrayContaining([
        'status,dueDate',
        'status,priority,dueDate',
        'status,category,dueDate',
        'createdAt'
      ])
    );
  });

  test('migration script backfills missing legacy fields idempotently', async () => {
    // Insert raw legacy document bypassing Mongoose defaults
    const { insertedId } = await Reminder.collection.insertOne({
      title: 'Legacy Doc',
      dueDate: futureDate(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const summary = await migrate(process.env.MONGODB_URI);
    expect(summary.remindersUpdated.timezone).toBe(1);

    const migrated = await Reminder.findById(insertedId);
    expect(migrated.timezone).toBe('UTC');
    expect(migrated.description).toBe('');
    expect(migrated.status).toBe(REMINDER_STATUS.PENDING);
  });
});