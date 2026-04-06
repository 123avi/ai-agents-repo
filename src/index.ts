import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

/**
 * Application entry point for the To-Do API server.
 * Initializes the Express server with all middleware and routes.
 */
const startServer = async (): Promise<void> => {
  try {
    const PORT = process.env.PORT ?? '3000';
    const NODE_ENV = process.env.NODE_ENV ?? 'development';
    
    // eslint-disable-next-line no-console
    console.log(`Starting To-Do API server...`);
    // eslint-disable-next-line no-console
    console.log(`Environment: ${NODE_ENV}`);
    // eslint-disable-next-line no-console
    console.log(`Port: ${PORT}`);
    
    // TODO: Initialize Express app, middleware, and routes
    // This will be implemented in subsequent tasks
    
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
void startServer();