import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Default configuration values
 */
const DEFAULT_PORT = 3000;
const DEFAULT_NODE_ENV = 'development';
const DEFAULT_API_VERSION = 'v1';
const DEFAULT_CORS_ORIGIN = '*';

/**
 * Environment configuration interface
 */
interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  apiVersion: string;
  corsOrigin: string;
}

/**
 * Parse port number from environment variable with fallback
 * @param portEnv - Environment variable value
 * @returns Parsed port number
 */
function parsePort(portEnv: string | undefined): number {
  if (!portEnv) return DEFAULT_PORT;
  
  const port = parseInt(portEnv, 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    console.warn(`Invalid PORT value: ${portEnv}. Using default: ${DEFAULT_PORT}`);
    return DEFAULT_PORT;
  }
  
  return port;
}

/**
 * Application environment configuration
 */
export const config: EnvironmentConfig = {
  port: parsePort(process.env.PORT),
  nodeEnv: process.env.NODE_ENV || DEFAULT_NODE_ENV,
  apiVersion: process.env.API_VERSION || DEFAULT_API_VERSION,
  corsOrigin: process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN
};

/**
 * Check if application is running in production
 * @returns True if NODE_ENV is production
 */
export function isProduction(): boolean {
  return config.nodeEnv === 'production';
}

/**
 * Check if application is running in development
 * @returns True if NODE_ENV is development
 */
export function isDevelopment(): boolean {
  return config.nodeEnv === 'development';
}