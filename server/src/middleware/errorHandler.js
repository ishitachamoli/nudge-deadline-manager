/**
 * Error Handling Middleware
 * Centralized error handling for the Express application.
 */

const { ApiResponse } = require('@nudge/shared');

/**
 * Custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

class ValidationError extends AppError {
  constructor(message, errors) {
    super(message, 422, errors);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

/**
 * Handle Mongoose validation errors
 */
function handleMongooseValidationError(error) {
  const errors = Object.values(error.errors).map(err => ({
    field: err.path,
    message: err.message
  }));
  return new ValidationError('Validation failed', errors);
}

/**
 * Handle Mongoose duplicate key errors
 */
function handleDuplicateKeyError(error) {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  return new ConflictError(`${field} '${value}' already exists`);
}

/**
 * Handle Mongoose cast errors (invalid ObjectId)
 */
function handleCastError(error) {
  return new ValidationError(`Invalid ${error.path}: ${error.value}`);
}

/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Log error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    });
  }

  // Handle known operational errors
  if (err.isOperational) {
    const { response, statusCode } = ApiResponse.error(err.message, err.errors, err.statusCode);
    return res.status(statusCode).json(response);
  }

  // Handle Mongoose errors
  if (err.name === 'ValidationError') {
    const operationalError = handleMongooseValidationError(err);
    const { response, statusCode } = ApiResponse.error(operationalError.message, operationalError.errors, operationalError.statusCode);
    return res.status(statusCode).json(response);
  }

  if (err.code === 11000) {
    const operationalError = handleDuplicateKeyError(err);
    const { response, statusCode } = ApiResponse.error(operationalError.message, operationalError.errors, operationalError.statusCode);
    return res.status(statusCode).json(response);
  }

  if (err.name === 'CastError') {
    const operationalError = handleCastError(err);
    const { response, statusCode } = ApiResponse.error(operationalError.message, operationalError.errors, operationalError.statusCode);
    return res.status(statusCode).json(response);
  }

  // Handle unexpected errors
  console.error('[Error] Unexpected error:', err);
  const { response, statusCode } = ApiResponse.serverError('An unexpected error occurred');
  return res.status(statusCode).json(response);
}

/**
 * 404 handler for unmatched routes
 */
function notFoundHandler(req, res) {
  const { response, statusCode } = ApiResponse.notFound(`Route ${req.method} ${req.path}`);
  res.status(statusCode).json(response);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError
};