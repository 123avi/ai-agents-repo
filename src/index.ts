import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT ?? '3000';
const NODE_ENV = process.env.NODE_ENV ?? 'development';

/**
 * Creates and configures the Express application
 * @returns Express application instance
 */
function createApp(): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Parse JSON bodies
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
    });
  });

  // Basic route
  app.get('/', (_req, res) => {
    res.status(200).json({
      message: 'Todo API Server',
      version: '1.0.0',
      environment: NODE_ENV,
    });
  });

  return app;
}

/**
 * Starts the HTTP server
 */
function startServer(): void {
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

export { createApp, startServer };