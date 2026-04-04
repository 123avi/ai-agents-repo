import { createServer } from './server';
import { getPort, getHost } from './app';

/**
 * Application entry point
 * Starts the Express server and handles startup errors
 */
async function main(): Promise<void> {
  try {
    const port = getPort();
    const host = getHost();
    
    const server = createServer();
    
    server.listen(port, host, () => {
      console.log(`Server running on http://${host}:${port}`);
      console.log(`Health check: http://${host}:${port}/api/health`);
    });
    
    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error in main:', error);
    process.exit(1);
  });
}