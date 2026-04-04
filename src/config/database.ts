/**
 * Database configuration module
 * Centralizes all database connection settings and environment variables
 */

/** Minimum connections required by NFR */
const MIN_CONNECTIONS = 20;

/** Default maximum connections for connection pool */
const DEFAULT_MAX_CONNECTIONS = 100;

/** Default connection timeout in milliseconds */
const DEFAULT_CONNECTION_TIMEOUT = 30000;

/** Default idle timeout in milliseconds */
const DEFAULT_IDLE_TIMEOUT = 10000;

/**
 * Database configuration object constructed from environment variables
 * Validates required environment variables and provides defaults
 */
export const DB_CONFIG = {
  connectionString: process.env.DATABASE_URL || '',
  min: MIN_CONNECTIONS,
  max: parseInt(process.env.DB_MAX_CONNECTIONS || DEFAULT_MAX_CONNECTIONS.toString(), 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || DEFAULT_CONNECTION_TIMEOUT.toString(), 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || DEFAULT_IDLE_TIMEOUT.toString(), 10),
};

/**
 * Validates that all required database configuration is present
 * @throws {Error} If DATABASE_URL environment variable is missing
 */
export function validateDatabaseConfig(): void {
  if (!DB_CONFIG.connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  if (DB_CONFIG.min < MIN_CONNECTIONS) {
    throw new Error(`Minimum connections must be at least ${MIN_CONNECTIONS} per NFR requirements`);
  }
}