import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'joi';

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Validation error class
 */
export class RequestValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
  }
}

/**
 * Centralized error handling middleware
 * Standardizes API error responses across all endpoints
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    let statusCode = 500;
    let message = 'Internal server error';
    let details: any = undefined;

    // Handle Joi validation errors
    if (err instanceof ValidationError) {
      statusCode = 400;
      message = 'Validation failed';
      details = err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
    }
    // Handle custom application errors
    else if (err instanceof AppError) {
      statusCode = err.statusCode;
      message = err.message;
    }
    // Handle other known error types
    else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Invalid or expired token';
    }
    else if (err.name === 'CastError' || err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Invalid request data';
    }
    else {
      // Log unexpected errors
      console.error('Unexpected error:', {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        path: req.path,
        method: req.method
      });
    }

    // Return standardized error response
    const errorResponse = {
      success: false,
      error: {
        message,
        statusCode,
        ...(details && { details }),
        ...(process.env.NODE_ENV === 'development' && {
          stack: err.stack
        })
      },
      timestamp: new Date().toISOString()
    };

    res.status(statusCode).json(errorResponse);
  } catch (handlerError) {
    // Fallback error handling
    console.error('Error in error handler:', handlerError);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        statusCode: 500
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Async error wrapper for route handlers
 * Catches async errors and forwards them to error handling middleware
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for undefined routes
 * Should be used as the last middleware before error handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};