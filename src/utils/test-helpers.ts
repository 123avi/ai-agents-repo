import express from 'express';
import { authRoutes } from '../routes/auth';

/**
 * Creates a test Express application with auth routes configured
 * @returns Express application instance for testing
 */
export function createTestApp(): express.Application {
  const app = express();
  
  app.use(express.json());
  app.use('/auth', authRoutes);
  
  return app;
}