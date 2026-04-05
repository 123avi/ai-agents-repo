/**
 * Custom error class for resource not found errors
 * Returns 404 status code
 */
class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.code = 'NOT_FOUND';
  }
}

/**
 * Custom error class for forbidden access errors
 * Returns 403 status code
 */
class ForbiddenError extends Error {
  constructor(message = 'Access forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
    this.code = 'FORBIDDEN';
  }
}

/**
 * Custom error class for validation errors
 * Returns 400 status code
 */
class ValidationError extends Error {
  constructor(message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.code = 'VALIDATION_ERROR';
  }
}

module.exports = {
  NotFoundError,
  ForbiddenError,
  ValidationError
};