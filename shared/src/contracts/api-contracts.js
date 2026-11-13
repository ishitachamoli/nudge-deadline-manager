/**
 * Shared API Contracts for Nudge
 *
 * This module defines the contract between frontend, backend, and scheduler.
 * Uses JSDoc for type documentation since we're using plain JavaScript.
 */

/**
 * @typedef {Object} ReminderStatus
 * @property {'pending' | 'completed' | 'cancelled'} status
 */

/**
 * @typedef {Object} ReminderPriority
 * @property {'low' | 'medium' | 'high'} priority
 */

/**
 * @typedef {Object} ReminderCategory
 * @property {'personal' | 'work' | 'study' | 'health' | 'other'} category
 */

/**
 * @typedef {Object} Reminder
 * @property {string} id - MongoDB ObjectId as string
 * @property {string} title
 * @property {string} [description]
 * @property {ReminderCategory} category
 * @property {string} dueDate - ISO 8601 UTC timestamp
 * @property {string} [timezone] - IANA timezone identifier (e.g., 'America/New_York')
 * @property {ReminderPriority} priority
 * @property {ReminderStatus} status
 * @property {string} createdAt - ISO 8601 UTC timestamp
 * @property {string} updatedAt - ISO 8601 UTC timestamp
 */

/**
 * @typedef {Object} CreateReminderInput
 * @property {string} title - Required, max 200 chars
 * @property {string} [description] - Optional, max 2000 chars
 * @property {ReminderCategory} [category='other']
 * @property {string} dueDate - Required, ISO 8601 UTC timestamp
 * @property {string} [timezone] - Optional IANA timezone
 * @property {ReminderPriority} [priority='medium']
 */

/**
 * @typedef {Object} UpdateReminderInput
 * @property {string} [title]
 * @property {string} [description]
 * @property {ReminderCategory} [category]
 * @property {string} [dueDate]
 * @property {string} [timezone]
 * @property {ReminderPriority} [priority]
 * @property {ReminderStatus} [status]
 */

/**
 * @typedef {Object} NotificationStatus
 * @property {'pending' | 'sent' | 'failed' | 'cancelled'} status
 */

/**
 * @typedef {Object} NotificationLog
 * @property {string} id - MongoDB ObjectId as string
 * @property {string} reminderId - Reference to Reminder
 * @property {string} scheduledAt - ISO 8601 UTC timestamp when notification should fire
 * @property {string} [attemptedAt] - ISO 8601 UTC timestamp when actually attempted
 * @property {NotificationStatus} status
 * @property {number} attemptCount - Number of delivery attempts
 * @property {string} idempotencyKey - Unique key to prevent duplicate processing
 * @property {string} [errorMessage] - Error details if failed
 * @property {string} [nextRetryAt] - ISO 8601 UTC timestamp for next retry
 * @property {string} createdAt - ISO 8601 UTC timestamp
 * @property {string} updatedAt - ISO 8601 UTC timestamp
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {any} [data]
 * @property {string} [message]
 * @property {Object} [error]
 * @property {Object} [meta] - Pagination, etc.
 */

/**
 * Standard API response helpers
 */
const ApiResponse = {
  success(data, message = 'Success', meta = {}, statusCode = 200) {
    return { response: { success: true, data, message, meta }, statusCode };
  },

  error(message, error = null, statusCode = 400) {
    const response = { success: false, message };
    if (error) response.error = error;
    return { response, statusCode };
  },

  notFound(resource = 'Resource') {
    return this.error(`${resource} not found`, null, 404);
  },

  validationError(errors) {
    return this.error('Validation failed', { errors }, 422);
  },

  serverError(message = 'Internal server error') {
    return this.error(message, null, 500);
  }
};

/**
 * Reminder status constants
 */
const REMINDER_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Reminder priority constants
 */
const REMINDER_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

/**
 * Reminder category constants
 */
const REMINDER_CATEGORY = {
  PERSONAL: 'personal',
  WORK: 'work',
  STUDY: 'study',
  HEALTH: 'health',
  OTHER: 'other'
};

/**
 * Notification status constants
 */
const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Maximum retry attempts for notification delivery
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Base retry delay in milliseconds (exponential backoff: base * 2^attempt)
 */
const BASE_RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * API route constants
 */
const API_ROUTES = {
  REMINDERS: '/api/reminders',
  NOTIFICATIONS: '/api/notifications',
  HEALTH: '/health'
};

/**
 * Scheduler job types
 */
const SCHEDULER_JOB_TYPES = {
  PROCESS_DUE_REMINDERS: 'process-due-reminders',
  RETRY_FAILED_NOTIFICATIONS: 'retry-failed-notifications',
  CLEANUP_STALE_JOBS: 'cleanup-stale-jobs'
};

module.exports = {
  ApiResponse,
  REMINDER_STATUS,
  REMINDER_PRIORITY,
  REMINDER_CATEGORY,
  NOTIFICATION_STATUS,
  MAX_RETRY_ATTEMPTS,
  BASE_RETRY_DELAY_MS,
  API_ROUTES,
  SCHEDULER_JOB_TYPES
};