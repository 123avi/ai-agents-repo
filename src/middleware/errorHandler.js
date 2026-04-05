const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorHandler = (error, req, res, next) => {
  logger.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Database constraint violations
  if (error.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'Resource already exists'
      }
    });
  }

  // Database connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Service temporarily unavailable'
      }
    });
  }

  // Default server error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
};

module.exports = errorHandler;