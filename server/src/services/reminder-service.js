/**
 * Reminder Service
 * Business logic for reminder operations.
 * Separated from controllers for testability and reusability.
 */

const { Reminder, NotificationLog } = require('../models');
const { REMINDER_STATUS, NOTIFICATION_STATUS } = require('@nudge/shared');
const { AppError, NotFoundError } = require('../middleware');

/**
 * Create a new reminder
 * @param {Object} data - Reminder data
 * @returns {Promise<Object>} Created reminder
 */
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

/**
 * Get reminder by ID
 * @param {string} id - Reminder ID
 * @returns {Promise<Object>} Reminder document
 */
async function getReminderById(id) {
  const reminder = await Reminder.findById(id);
  if (!reminder) {
    throw new NotFoundError('Reminder');
  }
  return reminder;
}

/**
 * List reminders with filtering, sorting, and pagination
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Paginated results
 */
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
  const sortField = isPrioritySort ? 'dueDate' : sortBy; // Fallback sort for priority
  const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  // Fetch more than limit if priority sorting (to sort in JS)
  const fetchLimit = isPrioritySort ? Math.min(limit * 5, 100) : limit;

  const [reminders, total] = await Promise.all([
    Reminder.find(filter).sort(sort).skip(skip).limit(fetchLimit),
    Reminder.countDocuments(filter)
  ]);

  // Sort by priority in JavaScript if needed (MongoDB sorts alphabetically)
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

/**
 * Update a reminder
 * @param {string} id - Reminder ID
 * @param {Object} data - Updated fields
 * @returns {Promise<Object>} Updated reminder
 */
async function updateReminder(id, data) {
  const reminder = await getReminderById(id);

  // Track original values for scheduler integration
  const originalDueDate = reminder.dueDate.getTime();
  const originalStatus = reminder.status;
  const wasPending = originalStatus === REMINDER_STATUS.PENDING;

  // Track if dueDate changed
  const dueDateChanged = data.dueDate
    ? new Date(data.dueDate).getTime() !== originalDueDate
    : false;

  // Apply updates
  Object.keys(data).forEach(key => {
    if (key === 'dueDate') {
      reminder.dueDate = new Date(data.dueDate);
    } else if (key !== '_id' && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
      reminder[key] = data[key];
    }
  });

  // If reminder was completed/cancelled and is being updated with new due date, reset status to pending
  if (dueDateChanged && reminder.status !== REMINDER_STATUS.PENDING) {
    reminder.status = REMINDER_STATUS.PENDING;
  }

  await reminder.save();

  // Return info about what changed for scheduler integration
  return {
    reminder,
    meta: {
      dueDateChanged,
      wasPending,
      statusChanged: reminder.status !== originalStatus,
      originalStatus,
      originalDueDate
    }
  };
}

/**
 * Mark reminder as completed
 * @param {string} id - Reminder ID
 * @returns {Promise<Object>} Updated reminder
 */
async function completeReminder(id) {
  const reminder = await getReminderById(id);

  if (reminder.status === REMINDER_STATUS.COMPLETED) {
    return reminder; // Idempotent
  }

  if (reminder.status === REMINDER_STATUS.CANCELLED) {
    throw new AppError('Cannot complete a cancelled reminder', 400);
  }

  reminder.status = REMINDER_STATUS.COMPLETED;
  await reminder.save();

  return reminder;
}

/**
 * Delete a reminder
 * @param {string} id - Reminder ID
 * @returns {Promise<void>}
 */
async function deleteReminder(id) {
  const reminder = await getReminderById(id);
  await Reminder.findByIdAndDelete(id);

  // Note: NotificationLog cleanup is handled by scheduler integration
  // or can be done here if needed immediately
}

/**
 * Get overdue reminders
 * @returns {Promise<Array>} Overdue reminders
 */
async function getOverdueReminders() {
  return Reminder.findOverdue();
}

/**
 * Get upcoming reminders
 * @param {number} limit - Maximum number of reminders
 * @returns {Promise<Array>} Upcoming reminders
 */
async function getUpcomingReminders(limit = 50) {
  return Reminder.findUpcoming(limit);
}

/**
 * Get reminder statistics
 * @returns {Promise<Object>} Statistics
 */
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