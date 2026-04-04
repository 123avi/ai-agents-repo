import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 * Catches all errors and formats consistent error responses
 * @param error - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle ApiError instances
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
}