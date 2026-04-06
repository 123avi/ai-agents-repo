import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';

// Constants
const DEFAULT_PORT = 3000;
const SHUTDOWN_TIMEOUT = 10000;

/**
 * Creates and configures the Express application with middleware stack
 * @returns {express.Application} Configured Express app instance
 */
export function createApp(): express.Application {
  const app = express();

  // Security middleware - must be first
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // JSON parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}

/**
 * Starts the Express server and sets up graceful shutdown handling
 * @returns {Promise<void>} Resolves when server is started
 */
export async function startServer(): Promise<void> {
  const app = createApp();
  const port = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
  
  const server = createServer(app);
  
  return new Promise<void>((resolve, reject) => {
    server.listen(port, (err?: Error) => {
      if (err) {
        console.error('Failed to start server:', err);
        reject(err);
        return;
      }
      
      console.log(`Server running on port ${port}`);
      resolve();
    });
    
    // Graceful shutdown handling
    const shutdown = (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
      
      // Force shutdown after timeout
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  });
}