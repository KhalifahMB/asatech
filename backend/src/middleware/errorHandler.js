import ErrorResponse from '../utils/errorResponse.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  if (config.nodeEnv === 'development') {
    logger.error('Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('Error:', {
      message: err.message,
      path: req.path,
      method: req.method,
    });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new ErrorResponse(message, 404, 'NOT_FOUND');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value for field: ${field}`;
    error = new ErrorResponse(message, 409, 'DUPLICATE_VALUE');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map(val => val.message)
      .join(', ');
    error = new ErrorResponse(message, 422, 'VALIDATION_ERROR');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ErrorResponse(message, 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ErrorResponse(message, 401, 'TOKEN_EXPIRED');
  }

  // Handle operational errors
  if (err.isOperational) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    });
    return;
  }

  // Programming or unknown errors: don't leak error details
  res.status(500).json({
    success: false,
    error: {
      message: config.nodeEnv === 'development' ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
};

export default errorHandler;
