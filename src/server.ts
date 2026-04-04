import { Application } from 'express';
import { createApp } from './app.js';
import { config } from './config/environment.js';

/**
 * Server instance interface
 */
interface Server {
  app: Application;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * Create server instance
 * @returns Server object with start/stop methods
 */
export function createServer(): Server {
  const app = createApp();
  let serverInstance: any = null;
  
  /**
   * Start the server
   */
  const start = async (): Promise<void> => {
    try {
      serverInstance = app.listen(config.port, () => {
        console.log(`Server running on port ${config.port}`);
        console.log(`Environment: ${config.nodeEnv}`);
        console.log(`Health check: http://localhost:${config.port}/health`);
      });
      
      // Handle server errors
      serverInstance.on('error', (error: Error) => {
        console.error('Server error:', error);
        process.exit(1);
      });
      
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };
  
  /**
   * Stop the server gracefully
   */
  const stop = async (): Promise<void> => {
    if (serverInstance) {
      return new Promise((resolve) => {
        serverInstance.close(() => {
          console.log('Server stopped');
          resolve();
        });
      });
    }
  };
  
  return { app, start, stop };
}