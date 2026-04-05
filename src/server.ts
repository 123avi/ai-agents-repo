import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Constants
const DEFAULT_PORT = 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

/**
 * Creates and configures the Express application
 * @returns Configured Express application instance
 */
function createApp(): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({ origin: CORS_ORIGIN }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  return app;
}

/**
 * Starts the HTTP server on the specified port
 * @param port - Port number to listen on
 */
function startServer(port: number): void {
  const app = createApp();
  const server = createServer(app);

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Start server if this file is run directly
if (require.main === module) {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  startServer(port);
}

export { createApp, startServer };