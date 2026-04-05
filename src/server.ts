import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import todoRoutes from './routes/todo.routes';
import { jwtMiddleware } from './middleware/jwt.middleware';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/request-logger.middleware';

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

/**
 * Creates and configures Express application with middleware and routes
 * @returns Configured Express application instance
 */
function createApp(): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  if (NODE_ENV !== 'test') {
    app.use(requestLogger);
  }

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Mount auth routes (public)
  app.use('/api/auth', authRoutes);

  // Mount todo routes (protected with JWT middleware)
  app.use('/api/todos', jwtMiddleware, todoRoutes);

  // Error handling middleware (registered last)
  app.use(errorHandler);

  return app;
}

/**
 * Starts the Express server on the configured port
 * @param app Express application instance
 * @returns Promise that resolves when server is listening
 */
function startServer(app: express.Application): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
        resolve();
      });

      server.on('error', (error) => {
        console.error('Server startup error:', error);
        reject(error);
      });

      // Graceful shutdown handling
      process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('SIGINT received, shutting down gracefully');
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
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
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { createApp, startServer };
export default createApp;