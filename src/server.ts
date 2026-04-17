import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createAuthRouter } from './routes/auth';
import { createTodoRouter } from './routes/todo';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';

const PORT = parseInt(process.env.PORT || '3000', 10);
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

/**
 * Creates and configures the Express application
 * @returns Configured Express app instance
 */
export function createApp(): express.Application {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: CORS_ORIGINS,
    credentials: true
  }));

  // JSON parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Mount routes
  app.use('/health', healthRouter);
  app.use('/auth', createAuthRouter());
  app.use('/todos', createTodoRouter());

  // Global error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Starts the Express server
 * @param app - Express application instance
 * @returns Promise that resolves when server is listening
 */
export function startServer(app: express.Application): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        resolve();
      });

      server.on('error', (error) => {
        console.error('Server error:', error);
        reject(error);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      reject(error);
    }
  });
}

// Start server if this file is run directly
if (require.main === module) {
  const app = createApp();
  startServer(app).catch((error) => {
    console.error('Application startup failed:', error);
    process.exit(1);
  });
}