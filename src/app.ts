import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/environment.js';
import { SERVER_CONSTANTS } from './constants/server.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRoutes } from './routes/health.js';

/**
 * Create and configure Express application
 * Sets up middleware, routes, and error handling
 */
export function createApp(): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging in development
  if (config.isDevelopment()) {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
  }

  // Health check route (outside API prefix for load balancer access)
  app.use(SERVER_CONSTANTS.HEALTH_CHECK_PATH, healthRoutes);

  // API routes placeholder
  app.use(SERVER_CONSTANTS.API_PREFIX, (req, res) => {
    res.json({ message: 'API routes will be implemented here' });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`,
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}