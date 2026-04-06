import { startServer } from './app';

/**
 * Application entry point - starts the Express server
 */
async function main(): Promise<void> {
  try {
    await startServer();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error in main:', error);
    process.exit(1);
  });
}