/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

/**
 * Global error handler middleware
 */
const errorHandler = (error, req, res, next) => {
  const timestamp = new Date().toISOString();
  
  // Log error for debugging
  console.error(`[${timestamp}] Error:`, {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Default error response
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let errorCode = error.errorCode || 'INTERNAL_ERROR';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
  }

  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errorCode = 'INVALID_TOKEN';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  // PostgreSQL errors
  if (error.code === '23505') { // Unique violation
    statusCode = 409;
    message = 'Resource already exists';
    errorCode = 'DUPLICATE_RESOURCE';
  }

  if (error.code === '23503') { // Foreign key violation
    statusCode = 400;
    message = 'Invalid reference';
    errorCode = 'FOREIGN_KEY_VIOLATION';
  }

  // Database connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Database unavailable';
    errorCode = 'DATABASE_UNAVAILABLE';
  }

  // Build error response
  const errorResponse = {
    success: false,
    message,
    code: errorCode,
    timestamp
  };

  // Add details for validation errors
  if (error.details) {
    errorResponse.details = error.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.originalError = error.message;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    availableRoutes: {
      auth: '/api/v1/auth/*',
      user: '/api/v1/user/*',
      admin: '/api/v1/admin/*',
      health: '/health',
      docs: '/api/v1/docs'
    }
  });
};

/**
 * Async error wrapper to catch async function errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  
  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler
};