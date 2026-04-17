/**
 * Database configuration module
 * Loads and validates database connection parameters from environment variables
 */

import { PoolConfig } from 'pg';

/** Database configuration interface */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  minConnections: number;
  maxConnections: number;
  idleTimeoutMillis: number;
}

/** Default configuration values */
const DEFAULT_PORT = 5432;
const DEFAULT_MIN_CONNECTIONS = 5;
const DEFAULT_MAX_CONNECTIONS = 20;
const DEFAULT_IDLE_TIMEOUT = 30000;

/**
 * Validates database configuration parameters
 * @param config - Database configuration object
 * @throws Error if configuration is invalid
 */
export function validateDatabaseConfig(config: DatabaseConfig): void {
  if (!config.host) {
    throw new Error('Database host is required');
  }
  
  if (!config.database) {
    throw new Error('Database name is required');
  }
  
  if (!config.user) {
    throw new Error('Database user is required');
  }
  
  if (!config.password) {
    throw new Error('Database password is required');
  }
  
  if (config.minConnections < 1 || config.minConnections > 50) {
    throw new Error('minConnections must be between 1 and 50');
  }
  
  if (config.maxConnections < config.minConnections) {
    throw new Error('maxConnections must be greater than or equal to minConnections');
  }
  
  if (config.maxConnections > 100) {
    throw new Error('maxConnections cannot exceed 100');
  }
}

/**
 * Loads database configuration from environment variables
 * @returns DatabaseConfig object with validated parameters
 */
export function getDatabaseConfig(): DatabaseConfig {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || DEFAULT_PORT.toString(), 10),
    database: process.env.DB_NAME || 'todoapi',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || DEFAULT_MIN_CONNECTIONS.toString(), 10),
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || DEFAULT_MAX_CONNECTIONS.toString(), 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || DEFAULT_IDLE_TIMEOUT.toString(), 10)
  };
  
  validateDatabaseConfig(config);
  return config;
}