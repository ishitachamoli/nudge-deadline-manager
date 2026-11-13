/**
 * Notification Routes
 * RESTful API routes for notification log operations.
 */

const express = require('express');
const router = express.Router();
const { NotificationLog } = require('../models');
const {
  validate,
  listNotificationsQuerySchema,
  objectIdSchema,
  asyncHandler
} = require('../middleware');
const { ApiResponse, NOTIFICATION_STATUS } = require('@nudge/shared');

/**
 * @route GET /api/notifications
 * @description List notification logs with filtering and pagination
 * @access Public
 */
router.get(
  '/',
  validate(listNotificationsQuerySchema),
  asyncHandler(async (req, res) => {
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      reminderId
    } = req.validated.query;

    const filter = {};
    if (status) filter.status = status;
    if (reminderId) filter.reminderId = reminderId;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      NotificationLog.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('reminderId', 'title category dueDate'),
      NotificationLog.countDocuments(filter)
    ]);

    const { response, statusCode } = ApiResponse.success(
      notifications,
      'Notifications retrieved',
      { page, limit, total, totalPages: Math.ceil(total / limit) }
    );
    res.status(statusCode).json(response);
  })
);

/**
 * @route GET /api/notifications/:id
 * @description Get a single notification log by ID
 * @access Public
 */
router.get(
  '/:id',
  validate(objectIdSchema),
  asyncHandler(async (req, res) => {
    const notification = await NotificationLog.findById(req.validated.params.id)
      .populate('reminderId', 'title category dueDate priority status');

    if (!notification) {
      const { response, statusCode } = ApiResponse.notFound('Notification');
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = ApiResponse.success(notification, 'Notification retrieved');
    res.status(statusCode).json(response);
  })
);

/**
 * @route GET /api/notifications/reminder/:reminderId
 * @description Get all notifications for a specific reminder
 * @access Public
 */
router.get(
  '/reminder/:reminderId',
  validate(objectIdSchema),
  asyncHandler(async (req, res) => {
    const notifications = await NotificationLog.find({ reminderId: req.validated.params.reminderId })
      .sort({ scheduledAt: 1 })
      .populate('reminderId', 'title category dueDate');

    const { response, statusCode } = ApiResponse.success(notifications, 'Notifications retrieved');
    res.status(statusCode).json(response);
  })
);

/**
 * @route POST /api/notifications/:id/retry
 * @description Manually retry a failed notification
 * @access Public
 */
router.post(
  '/:id/retry',
  validate(objectIdSchema),
  asyncHandler(async (req, res) => {
    const notification = await NotificationLog.findById(req.validated.params.id);

    if (!notification) {
      const { response, statusCode } = ApiResponse.notFound('Notification');
      return res.status(statusCode).json(response);
    }

    if (notification.status !== NOTIFICATION_STATUS.FAILED) {
      const { response, statusCode } = ApiResponse.error(
        'Only failed notifications can be retried',
        null,
        400
      );
      return res.status(statusCode).json(response);
    }

    // Reset for retry
    notification.status = NOTIFICATION_STATUS.PENDING;
    notification.nextRetryAt = null;
    await notification.save();

    const { response, statusCode } = ApiResponse.success(notification, 'Notification queued for retry');
    res.status(statusCode).json(response);
  })
);

module.exports = router;