/**
 * Reminder Routes
 * RESTful API routes for reminder operations.
 */

const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminder-controller');
const {
  validate,
  createReminderSchema,
  updateReminderSchema,
  objectIdSchema,
  listRemindersQuerySchema
} = require('../middleware');

/**
 * @route POST /api/reminders
 * @description Create a new reminder
 * @access Public
 */
router.post(
  '/',
  validate(createReminderSchema),
  reminderController.createReminder
);

/**
 * @route GET /api/reminders
 * @description List reminders with filtering and pagination
 * @access Public
 */
router.get(
  '/',
  validate(listRemindersQuerySchema),
  reminderController.listReminders
);

/**
 * @route GET /api/reminders/stats
 * @description Get reminder statistics
 * @access Public
 */
router.get(
  '/stats',
  reminderController.getReminderStats
);

/**
 * @route GET /api/reminders/:id
 * @description Get a single reminder by ID
 * @access Public
 */
router.get(
  '/:id',
  validate(objectIdSchema),
  reminderController.getReminder
);

/**
 * @route PATCH /api/reminders/:id
 * @description Update a reminder (partial update)
 * @access Public
 */
router.patch(
  '/:id',
  validate(objectIdSchema),
  validate(updateReminderSchema),
  reminderController.updateReminder
);

/**
 * @route PATCH /api/reminders/:id/complete
 * @description Mark reminder as completed
 * @access Public
 */
router.patch(
  '/:id/complete',
  validate(objectIdSchema),
  reminderController.completeReminder
);

/**
 * @route DELETE /api/reminders/:id
 * @description Delete a reminder
 * @access Public
 */
router.delete(
  '/:id',
  validate(objectIdSchema),
  reminderController.deleteReminder
);

module.exports = router;