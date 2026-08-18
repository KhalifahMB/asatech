/**
 * Standardized error response utility
 */
class ErrorResponse extends Error {
  constructor(message, statusCode, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create error response for API
   */
  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
      },
    };
  }

  /**
   * Bad request error (400)
   */
  static badRequest(message, code = 'BAD_REQUEST') {
    return new ErrorResponse(message, 400, code);
  }

  /**
   * Unauthorized error (401)
   */
  static unauthorized(message = 'Unauthorized access', code = 'UNAUTHORIZED') {
    return new ErrorResponse(message, 401, code);
  }

  /**
   * Forbidden error (403)
   */
  static forbidden(message = 'Access forbidden', code = 'FORBIDDEN') {
    return new ErrorResponse(message, 403, code);
  }

  /**
   * Not found error (404)
   */
  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ErrorResponse(message, 404, code);
  }

  /**
   * Conflict error (409)
   */
  static conflict(message, code = 'CONFLICT') {
    return new ErrorResponse(message, 409, code);
  }

  /**
   * Validation error (422)
   */
  static validation(message, code = 'VALIDATION_ERROR') {
    return new ErrorResponse(message, 422, code);
  }

  /**
   * Internal server error (500)
   */
  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new ErrorResponse(message, 500, code);
  }

  /**
   * Payment error (402)
   */
  static paymentRequired(message, code = 'PAYMENT_ERROR') {
    return new ErrorResponse(message, 402, code);
  }
}

export default ErrorResponse;
