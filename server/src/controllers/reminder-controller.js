/**
 * Reminder Controller
 * HTTP request handlers for reminder endpoints.
 * Delegates business logic to reminder service.
 */

const reminderService = require('../services/reminder-service');
const { asyncHandler } = require('../middleware');
const { ApiResponse } = require('@nudge/shared');

/**
 * POST /api/reminders
 * Create a new reminder
 */
const createReminder = asyncHandler(async (req, res) => {
  const reminder = await reminderService.createReminder(req.validated.body);
  const { response, statusCode } = ApiResponse.success(reminder, 'Reminder created', 201);
  res.status(statusCode).json(response);
});

/**
 * GET /api/reminders
 * List reminders with filtering and pagination
 */
const listReminders = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder, ...filters } = req.validated.query;
  const result = await reminderService.listReminders({
    ...filters,
    page,
    limit,
    sortBy,
    sortOrder
  });
  const { response, statusCode } = ApiResponse.success(result.data, 'Reminders retrieved', result.meta);
  res.status(statusCode).json(response);
});

/**
 * GET /api/reminders/:id
 * Get a single reminder by ID
 */
const getReminder = asyncHandler(async (req, res) => {
  const reminder = await reminderService.getReminderById(req.validated.params.id);
  const { response, statusCode } = ApiResponse.success(reminder, 'Reminder retrieved');
  res.status(statusCode).json(response);
});

/**
 * PATCH /api/reminders/:id
 * Update a reminder (partial update)
 */
const updateReminder = asyncHandler(async (req, res) => {
  const { reminder, meta } = await reminderService.updateReminder(
    req.validated.params.id,
    req.validated.body
  );
  const { response, statusCode } = ApiResponse.success(
    reminder,
    'Reminder updated',
    { schedulerNotification: meta } // For scheduler integration
  );
  res.status(statusCode).json(response);
});

/**
 * PATCH /api/reminders/:id/complete
 * Mark reminder as completed
 */
const completeReminder = asyncHandler(async (req, res) => {
  const reminder = await reminderService.completeReminder(req.validated.params.id);
  const { response, statusCode } = ApiResponse.success(reminder, 'Reminder marked as completed');
  res.status(statusCode).json(response);
});

/**
 * DELETE /api/reminders/:id
 * Delete a reminder
 */
const deleteReminder = asyncHandler(async (req, res) => {
  await reminderService.deleteReminder(req.validated.params.id);
  const { response, statusCode } = ApiResponse.success(null, 'Reminder deleted');
  res.status(statusCode).json(response);
});

/**
 * GET /api/reminders/stats
 * Get reminder statistics
 */
const getReminderStats = asyncHandler(async (req, res) => {
  const stats = await reminderService.getReminderStats();
  const { response, statusCode } = ApiResponse.success(stats, 'Statistics retrieved');
  res.status(statusCode).json(response);
});

module.exports = {
  createReminder,
  listReminders,
  getReminder,
  updateReminder,
  completeReminder,
  deleteReminder,
  getReminderStats
};