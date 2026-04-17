import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Global error handling middleware that maps errors to appropriate HTTP status codes
 * @param error - The error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  // Handle service-specific errors
  if (error.message.includes('User already exists')) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (error.message.includes('Invalid credentials')) {
    res.status(401).json({ error: error.message });
    return;
  }

  // Default server error
  res.status(500).json({ error: 'Internal server error' });
}