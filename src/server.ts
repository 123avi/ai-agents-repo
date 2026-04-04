import { createApp } from './app.js';
import { config } from './config/environment.js';
import { SERVER_CONSTANTS } from './constants/server.js';

/**
 * Start the Express server
 * Handles graceful shutdown and error cases
 */
function startServer(): void {
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Health check: http://localhost:${config.port}${SERVER_CONSTANTS.HEALTH_CHECK_PATH}`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = (signal: string): void => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close((error) => {
      if (error) {
        console.error('Error during server shutdown:', error);
        process.exit(1);
      }
      
      console.log('Server closed successfully');
      process.exit(0);
    });

    // Force close after timeout
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, SERVER_CONSTANTS.SHUTDOWN_TIMEOUT_MS);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}