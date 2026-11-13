/**
 * Middleware Index
 * Exports all middleware for the server.
 */

const { validate, createReminderSchema, updateReminderSchema, objectIdSchema, listRemindersQuerySchema, listNotificationsQuerySchema } = require('./validate');
const { errorHandler, notFoundHandler, asyncHandler, AppError, NotFoundError, ValidationError, ConflictError } = require('./errorHandler');

module.exports = {
  validate,
  createReminderSchema,
  updateReminderSchema,
  objectIdSchema,
  listRemindersQuerySchema,
  listNotificationsQuerySchema,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError
};