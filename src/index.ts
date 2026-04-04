import { createServer } from './server.js';

/**
 * Application entry point
 */
async function main(): Promise<void> {
  const server = createServer();
  
  // Graceful shutdown handlers
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason: any) => {
    console.error('Unhandled rejection:', reason);
    process.exit(1);
  });
  
  // Start server
  await server.start();
}

// Run application
main().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});