import express, { Application, Request, Response, NextFunction } from 'express';
import { corsMiddleware } from './middleware/cors.js';
import { createHealthRouter } from './routes/health.js';
import { config } from './config/environment.js';

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
}

/**
 * HTTP status codes
 */
const HTTP_STATUS = {
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * Create and configure Express application
 * @returns Configured Express application
 */
export function createApp(): Application {
  const app = express();
  
  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // CORS middleware
  app.use(corsMiddleware);
  
  // Health check route
  app.use('/', createHealthRouter());
  
  // 404 handler
  app.use('*', (req: Request, res: Response<ErrorResponse>) => {
    const errorResponse: ErrorResponse = {
      error: 'Not Found',
      message: `Route ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    };
    
    res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse);
  });
  
  // Error handler
  app.use((error: Error, req: Request, res: Response<ErrorResponse>, next: NextFunction) => {
    console.error('Unhandled error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    const errorResponse: ErrorResponse = {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    };
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
  });
  
  return app;
}