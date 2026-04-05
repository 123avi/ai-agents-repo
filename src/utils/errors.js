/**
 * Custom application error class
 */
class AppError extends Error {
  /**
   * Creates an application error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database operation error class
 */
class DatabaseError extends Error {
  /**
   * Creates a database error
   * @param {string} message - Error message
   * @param {Error} originalError - Original database error
   */
  constructor(message, originalError) {
    super(message);
    this.originalError = originalError;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { AppError, DatabaseError };