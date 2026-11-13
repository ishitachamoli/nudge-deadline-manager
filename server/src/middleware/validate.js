/**
 * Validation Middleware
 * Uses Zod for request validation with detailed error messages.
 */

const { z } = require('zod');
const { REMINDER_STATUS, REMINDER_PRIORITY, REMINDER_CATEGORY } = require('@nudge/shared');

/**
 * Create reminder validation schema
 */
const createReminderSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional().default(''),
    category: z.enum(Object.values(REMINDER_CATEGORY)).optional().default(REMINDER_CATEGORY.OTHER),
    dueDate: z.string().datetime({ offset: true }, 'Due date must be a valid ISO 8601 datetime'),
    timezone: z.string().optional(),
    priority: z.enum(Object.values(REMINDER_PRIORITY)).optional().default(REMINDER_PRIORITY.MEDIUM)
  })
});

/**
 * Update reminder validation schema (all fields optional)
 */
const updateReminderSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters').optional(),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
    category: z.enum(Object.values(REMINDER_CATEGORY)).optional(),
    dueDate: z.string().datetime({ offset: true }, 'Due date must be a valid ISO 8601 datetime').optional(),
    timezone: z.string().optional(),
    priority: z.enum(Object.values(REMINDER_PRIORITY)).optional(),
    status: z.enum(Object.values(REMINDER_STATUS)).optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  })
});

/**
 * MongoDB ObjectId validation
 */
const objectIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid reminder ID format')
  })
});

/**
 * Query parameters validation for listing reminders
 */
const listRemindersQuerySchema = z.object({
  query: z.object({
    status: z.enum(Object.values(REMINDER_STATUS)).optional(),
    category: z.enum(Object.values(REMINDER_CATEGORY)).optional(),
    priority: z.enum(Object.values(REMINDER_PRIORITY)).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority']).optional().default('dueDate'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
  })
});

/**
 * Query parameters validation for listing notifications
 */
const listNotificationsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'sent', 'failed', 'cancelled']).optional(),
    reminderId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid reminder ID format').optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    sortBy: z.enum(['createdAt', 'scheduledAt', 'attemptedAt']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  })
});

/**
 * Generic validation middleware factory
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Merge validated data back into request (don't overwrite existing)
      req.validated = { ...req.validated, ...result };
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          error: { errors }
        });
      }
      next(error);
    }
  };
}

module.exports = {
  validate,
  createReminderSchema,
  updateReminderSchema,
  objectIdSchema,
  listRemindersQuerySchema,
  listNotificationsQuerySchema
};