/**
 * Reminder Service
 * Business logic for reminder operations.
 * Separated from controllers for testability and reusability.
 */

const { Reminder, NotificationLog } = require('../models');
const { REMINDER_STATUS, NOTIFICATION_STATUS } = require('@nudge/shared');
const { AppError, NotFoundError } = require('../middleware');

async function createReminder(data) {
  const reminder = await Reminder.create({
    title: data.title,
    description: data.description || '',
    category: data.category,
    dueDate: new Date(data.dueDate),
    timezone: data.timezone,
    priority: data.priority,
    status: REMINDER_STATUS.PENDING
  });

  return reminder;
}

async function getReminderById(id) {
  const reminder = await Reminder.findById(id);
  if (!reminder) {
    throw new NotFoundError('Reminder');
  }
  return reminder;
}

async function listReminders(options = {}) {
  const {
    status,
    category,
    priority,
    page = 1,
    limit = 20,
    sortBy = 'dueDate',
    sortOrder = 'asc'
  } = options;

  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;

  const isPrioritySort = sortBy === 'priority';
  const sortField = isPrioritySort ? 'dueDate' : sortBy;
  const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;
  const fetchLimit = isPrioritySort ? Math.min(limit * 5, 100) : limit;

  const [reminders, total] = await Promise.all([
    Reminder.find(filter).sort(sort).skip(skip).limit(fetchLimit),
    Reminder.countDocuments(filter)
  ]);

  let data = reminders;
  if (isPrioritySort) {
    const priorityRank = { high: 3, medium: 2, low: 1 };
    data = reminders.sort((a, b) => {
      const rankA = priorityRank[a.priority] || 0;
      const rankB = priorityRank[b.priority] || 0;
      return sortOrder === 'asc' ? rankA - rankB : rankB - rankA;
    });
    data = data.slice(0, limit);
  }

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function updateReminder(id, data) {
  const reminder = await getReminderById(id);

  const originalDueDate = reminder.dueDate.getTime();
  const originalStatus = reminder.status;
  const wasPending = originalStatus === REMINDER_STATUS.PENDING;

  const dueDateChanged = data.dueDate
    ? new Date(data.dueDate).getTime() !== originalDueDate
    : false;

  Object.keys(data).forEach(key => {
    if (key === 'dueDate') {
      reminder.dueDate = new Date(data.dueDate);
    } else if (key !== '_id' && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
      reminder[key] = data[key];
    }
  });

  if (dueDateChanged && reminder.status !== REMINDER_STATUS.PENDING) {
    reminder.status = REMINDER_STATUS.PENDING;
  }

  await reminder.save();

  let cancelledNotifications = 0;
  if (dueDateChanged) {
    const cancelResult = await NotificationLog.updateMany(
      {
        reminderId: reminder._id,
        status: NOTIFICATION_STATUS.PENDING
      },
      {
        $set: {
          status: NOTIFICATION_STATUS.CANCELLED,
          nextRetryAt: null
        }
      }
    );
    cancelledNotifications = cancelResult.modifiedCount || 0;
  }

  return {
    reminder,
    meta: {
      dueDateChanged,
      wasPending,
      statusChanged: reminder.status !== originalStatus,
      originalStatus,
      originalDueDate,
      cancelledNotifications
    }
  };
}

async function completeReminder(id) {
  const reminder = await getReminderById(id);

  if (reminder.status === REMINDER_STATUS.COMPLETED) {
    return reminder;
  }

  if (reminder.status === REMINDER_STATUS.CANCELLED) {
    throw new AppError('Cannot complete a cancelled reminder', 400);
  }

  reminder.status = REMINDER_STATUS.COMPLETED;
  await reminder.save();

  return reminder;
}

async function deleteReminder(id) {
  await getReminderById(id);
  await Reminder.findByIdAndDelete(id);
}

async function getOverdueReminders() {
  return Reminder.findOverdue();
}

async function getUpcomingReminders(limit = 50) {
  return Reminder.findUpcoming(limit);
}

async function getReminderStats() {
  const [total, pending, completed, overdue] = await Promise.all([
    Reminder.countDocuments(),
    Reminder.countDocuments({ status: REMINDER_STATUS.PENDING }),
    Reminder.countDocuments({ status: REMINDER_STATUS.COMPLETED }),
    Reminder.countDocuments({
      status: REMINDER_STATUS.PENDING,
      dueDate: { $lt: new Date() }
    })
  ]);

  return { total, pending, completed, overdue };
}

module.exports = {
  createReminder,
  getReminderById,
  listReminders,
  updateReminder,
  completeReminder,
  deleteReminder,
  getOverdueReminders,
  getUpcomingReminders,
  getReminderStats
};
