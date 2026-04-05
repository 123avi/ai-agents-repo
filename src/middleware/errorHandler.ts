import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

/**
 * Standard error response format
 */
interface ErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

/**
 * Custom application error class with status code and error code
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, errorCode: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Constants for HTTP status codes
 */
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Constants for common error codes
 */
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Determines the appropriate HTTP status code based on error type
 */
function getStatusCode(error: Error): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  
  if (error.name === 'ValidationError') {
    return HTTP_STATUS.BAD_REQUEST;
  }
  
  if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
    return HTTP_STATUS.UNAUTHORIZED;
  }
  
  if (error.name === 'ForbiddenError' || error.message.includes('forbidden')) {
    return HTTP_STATUS.FORBIDDEN;
  }
  
  if (error.name === 'NotFoundError' || error.message.includes('not found')) {
    return HTTP_STATUS.NOT_FOUND;
  }
  
  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Determines the appropriate error code based on error type
 */
function getErrorCode(error: Error): string {
  if (error instanceof AppError) {
    return error.errorCode;
  }
  
  if (error.name === 'ValidationError') {
    return ERROR_CODES.VALIDATION_ERROR;
  }
  
  if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
    return ERROR_CODES.AUTHENTICATION_ERROR;
  }
  
  if (error.name === 'ForbiddenError' || error.message.includes('forbidden')) {
    return ERROR_CODES.AUTHORIZATION_ERROR;
  }
  
  if (error.name === 'NotFoundError' || error.message.includes('not found')) {
    return ERROR_CODES.RESOURCE_NOT_FOUND;
  }
  
  return ERROR_CODES.INTERNAL_ERROR;
}

/**
 * Sanitizes error messages for production environment
 */
function sanitizeErrorMessage(error: Error, isProduction: boolean): string {
  if (!isProduction) {
    return error.message;
  }
  
  // In production, show generic messages for security
  if (error instanceof AppError && error.isOperational) {
    return error.message;
  }
  
  const statusCode = getStatusCode(error);
  
  switch (statusCode) {
    case HTTP_STATUS.BAD_REQUEST:
      return 'Invalid request data';
    case HTTP_STATUS.UNAUTHORIZED:
      return 'Authentication required';
    case HTTP_STATUS.FORBIDDEN:
      return 'Access denied';
    case HTTP_STATUS.NOT_FOUND:
      return 'Resource not found';
    case HTTP_STATUS.CONFLICT:
      return 'Resource conflict';
    default:
      return 'Internal server error';
  }
}

/**
 * Centralized error handling middleware that catches all unhandled errors
 * and returns standardized JSON responses with appropriate HTTP status codes
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  // Log the error for debugging
  Logger.error('Unhandled error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    request: {
      id: requestId,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    },
  });
  
  const statusCode = getStatusCode(error);
  const errorCode = getErrorCode(error);
  const sanitizedMessage = sanitizeErrorMessage(error, isProduction);
  
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: sanitizedMessage,
      ...(requestId !== 'unknown' && { requestId }),
    },
  };
  
  res.status(statusCode).json(errorResponse);
}

export { HTTP_STATUS, ERROR_CODES };