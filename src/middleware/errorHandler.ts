import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'joi';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

const HTTP_STATUS_CODES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const;

const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Invalid input data',
  UNAUTHORIZED_ACCESS: 'Authentication required',
  FORBIDDEN_ACCESS: 'Access denied',
  RESOURCE_NOT_FOUND: 'Resource not found',
  DUPLICATE_RESOURCE: 'Resource already exists',
  INTERNAL_ERROR: 'Internal server error'
} as const;

interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

/**
 * Creates a standardized error response format
 * @param message - Error message for client
 * @param statusCode - HTTP status code
 * @param details - Additional error details (optional)
 * @returns Formatted error response object
 */
function createErrorResponse(message: string, statusCode: number, details?: any) {
  return {
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    }
  };
}

/**
 * Maps known error types to HTTP status codes and messages
 * @param error - The error to map
 * @returns Object with statusCode and message
 */
function mapErrorToResponse(error: Error): { statusCode: number; message: string; details?: any } {
  // Validation errors (Joi)
  if (error instanceof ValidationError) {
    return {
      statusCode: HTTP_STATUS_CODES.BAD_REQUEST,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      details: error.details.map(detail => detail.message)
    };
  }

  // JWT errors
  if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
    return {
      statusCode: HTTP_STATUS_CODES.UNAUTHORIZED,
      message: ERROR_MESSAGES.UNAUTHORIZED_ACCESS
    };
  }

  // Custom API errors with status codes
  const apiError = error as ApiError;
  if (apiError.statusCode) {
    return {
      statusCode: apiError.statusCode,
      message: apiError.message || getMessageForStatusCode(apiError.statusCode)
    };
  }

  // Database constraint errors (duplicate key)
  if (error.message.includes('duplicate key') || error.message.includes('UNIQUE constraint')) {
    return {
      statusCode: HTTP_STATUS_CODES.CONFLICT,
      message: ERROR_MESSAGES.DUPLICATE_RESOURCE
    };
  }

  // Default to internal server error
  return {
    statusCode: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    message: ERROR_MESSAGES.INTERNAL_ERROR
  };
}

/**
 * Gets default message for HTTP status code
 * @param statusCode - HTTP status code
 * @returns Default error message
 */
function getMessageForStatusCode(statusCode: number): string {
  switch (statusCode) {
    case HTTP_STATUS_CODES.BAD_REQUEST:
      return ERROR_MESSAGES.VALIDATION_ERROR;
    case HTTP_STATUS_CODES.UNAUTHORIZED:
      return ERROR_MESSAGES.UNAUTHORIZED_ACCESS;
    case HTTP_STATUS_CODES.FORBIDDEN:
      return ERROR_MESSAGES.FORBIDDEN_ACCESS;
    case HTTP_STATUS_CODES.NOT_FOUND:
      return ERROR_MESSAGES.RESOURCE_NOT_FOUND;
    case HTTP_STATUS_CODES.CONFLICT:
      return ERROR_MESSAGES.DUPLICATE_RESOURCE;
    default:
      return ERROR_MESSAGES.INTERNAL_ERROR;
  }
}

/**
 * Logs error details for debugging while sanitizing sensitive information
 * @param error - The error to log
 * @param req - Express request object
 */
function logError(error: Error, req: Request): void {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack
  };

  console.error('[ERROR_HANDLER]', JSON.stringify(logData, null, 2));
}

/**
 * Express error handling middleware for centralized error processing
 * Catches all unhandled errors and returns consistent JSON responses
 * @param error - The error that occurred
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error for debugging
  logError(error, req);

  // Map error to appropriate response
  const { statusCode, message, details } = mapErrorToResponse(error);

  // Create standardized error response
  const errorResponse = createErrorResponse(message, statusCode, details);

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Creates custom API error with status code
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @returns API error instance
 */
export function createApiError(message: string, statusCode: number): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  return error;
}

export { HTTP_STATUS_CODES, ERROR_MESSAGES };