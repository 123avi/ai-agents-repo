import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

/** Database connection configuration constants */
const DB_CONFIG = {
  MIN_CONNECTIONS: 20,
  MAX_CONNECTIONS: 50,
  CONNECTION_TIMEOUT: 30000,
  IDLE_TIMEOUT: 30000,
  HEALTH_CHECK_INTERVAL: 30000
} as const;

/** PostgreSQL connection pool instance */
let pool: Pool | null = null;

/**
 * Creates and configures a PostgreSQL connection pool
 * @returns {Pool} Configured connection pool
 * @throws {Error} If DATABASE_URL environment variable is not set
 */
export function createConnectionPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const config: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    min: DB_CONFIG.MIN_CONNECTIONS,
    max: DB_CONFIG.MAX_CONNECTIONS,
    connectionTimeoutMillis: DB_CONFIG.CONNECTION_TIMEOUT,
    idleTimeoutMillis: DB_CONFIG.IDLE_TIMEOUT,
    allowExitOnIdle: true
  };

  pool = new Pool(config);

  // Handle pool errors
  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
  });

  logger.info('Database connection pool created', {
    minConnections: DB_CONFIG.MIN_CONNECTIONS,
    maxConnections: DB_CONFIG.MAX_CONNECTIONS
  });

  return pool;
}

/**
 * Gets the existing connection pool instance
 * @returns {Pool} The connection pool instance
 * @throws {Error} If pool is not initialized
 */
export function getConnectionPool(): Pool {
  if (!pool) {
    throw new Error('Connection pool not initialized. Call createConnectionPool() first.');
  }
  return pool;
}

/**
 * Performs a health check on the database connection
 * @returns {Promise<boolean>} True if connection is healthy, false otherwise
 */
export async function checkConnectionHealth(): Promise<boolean> {
  try {
    if (!pool) {
      logger.warn('Connection pool not initialized for health check');
      return false;
    }

    const client = await pool.connect();
    try {
      const result = await client.query('SELECT 1 as healthy');
      const isHealthy = result.rows[0]?.healthy === 1;
      
      if (isHealthy) {
        logger.debug('Database health check passed');
      } else {
        logger.warn('Database health check returned unexpected result');
      }
      
      return isHealthy;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Database health check failed', error);
    return false;
  }
}

/**
 * Gracefully shuts down the connection pool
 * @returns {Promise<void>} Promise that resolves when shutdown is complete
 */
export async function closeConnectionPool(): Promise<void> {
  if (!pool) {
    logger.warn('Attempted to close non-existent connection pool');
    return;
  }

  try {
    logger.info('Shutting down database connection pool...');
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed successfully');
  } catch (error) {
    logger.error('Error closing database connection pool', error);
    throw error;
  }
}