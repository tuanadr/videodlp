const logger = require('./logger');

/**
 * Custom Error Classes for Better Error Handling
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400);
    this.field = field;
    this.type = 'validation';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.type = 'authentication';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.type = 'authorization';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.type = 'not_found';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.type = 'conflict';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.type = 'rate_limit';
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service error', service = null) {
    super(message, 502);
    this.service = service;
    this.type = 'external_service';
  }
}

/**
 * Standardized API Response Helper
 */
class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static error(res, error, statusCode = 500) {
    const response = {
      success: false,
      message: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    };

    // Add error details in development
    if (process.env.NODE_ENV === 'development') {
      response.error = {
        type: error.type || 'unknown',
        stack: error.stack,
        field: error.field
      };
    }

    // Add specific error fields
    if (error.field) response.field = error.field;
    if (error.service) response.service = error.service;

    return res.status(statusCode).json(response);
  }

  static validationError(res, errors) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Array.isArray(errors) ? errors : [errors],
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Async Error Wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global Error Handler Middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(`Global error handler: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle known operational errors
  if (err.isOperational) {
    return ApiResponse.error(res, err, err.statusCode);
  }

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
    return ApiResponse.validationError(res, errors);
  }

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'unknown';
    const error = new ConflictError(`${field} already exists`);
    error.field = field;
    return ApiResponse.error(res, error, 409);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    const error = new AuthenticationError('Invalid token');
    return ApiResponse.error(res, error, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const error = new AuthenticationError('Token expired');
    error.isExpired = true;
    return ApiResponse.error(res, error, 401);
  }

  // Handle unexpected errors
  logger.error('Unexpected error occurred', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  return ApiResponse.error(res, new AppError('Something went wrong', 500), 500);
};

/**
 * 404 Handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  ApiResponse,
  globalErrorHandler,
  asyncHandler,
  notFoundHandler
};