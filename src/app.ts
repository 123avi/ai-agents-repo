import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createHealthRouter } from './routes/health';

// Load environment variables
dotenv.config();

/**
 * HTTP status codes used throughout the application
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * Default server configuration
 */
const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';

/**
 * Creates and configures the Express application
 * @returns {express.Application} Configured Express app instance
 */
export function createApp(): express.Application {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/api/health', createHealthRouter());

  return app;
}

/**
 * Gets the port from environment variables or returns default
 * @returns {number} Port number for the server
 */
export function getPort(): number {
  const port = process.env.PORT;
  return port ? parseInt(port, 10) : DEFAULT_PORT;
}

/**
 * Gets the host from environment variables or returns default
 * @returns {string} Host address for the server
 */
export function getHost(): string {
  return process.env.HOST || DEFAULT_HOST;
}