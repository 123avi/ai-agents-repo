import { Pool } from 'pg';
import { createDatabaseConfig, DatabaseConfig } from '../config/database';

/**
 * Database connection pool instance
 */
let pool: Pool | null = null;

/**
 * Sanitizes error objects to prevent logging sensitive connection details
 * @param {Error} error - The error to sanitize
 * @returns {object} Sanitized error object safe for logging
 */
function sanitizeError(error: Error): object {
  const sanitized: any = {
    name: error.name,
    message: error.message
  };

  // Remove potentially sensitive properties
  const sensitiveProps = ['password', 'user', 'host', 'database', 'connection', 'client'];
  
  for (const prop in error) {
    if (!sensitiveProps.some(sensitive => prop.toLowerCase().includes(sensitive))) {
      sanitized[prop] = (error as any)[prop];
    }
  }

  return sanitized;
}

/**
 * Creates and configures PostgreSQL connection pool
 * @returns {Pool} Configured database connection pool
 */
export function createDatabasePool(): Pool {
  if (pool) {
    return pool;
  }

  const config = createDatabaseConfig();
  
  // Note: Password is securely passed from environment variables and should never be logged
  const poolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl.require ? {
      rejectUnauthorized: config.ssl.rejectUnauthorized
    } : false,
    min: config.pool.min,
    max: config.pool.max,
    idleTimeoutMillis: config.pool.idleTimeoutMillis,
    connectionTimeoutMillis: config.pool.connectionTimeoutMillis
  };

  pool = new Pool(poolConfig);

  // Handle pool errors with sanitized logging
  pool.on('error', (error) => {
    const sanitizedError = sanitizeError(error);
    console.error('Database pool error:', sanitizedError);
  });

  // Handle client connection errors
  pool.on('connect', () => {
    console.log('Database pool connected');
  });

  return pool;
}

/**
 * Gets the current database pool instance
 * @returns {Pool} Database connection pool
 * @throws {Error} When pool is not initialized
 */
export function getDatabasePool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call createDatabasePool() first.');
  }
  return pool;
}

/**
 * Performs database health check
 * @returns {Promise<boolean>} True if database is healthy, false otherwise
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const currentPool = getDatabasePool();
    const client = await currentPool.connect();
    
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    const sanitizedError = sanitizeError(error as Error);
    console.error('Database health check failed:', sanitizedError);
    return false;
  }
}

/**
 * Gracefully closes database pool connections
 * @returns {Promise<void>}
 */
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      console.log('Database pool closed successfully');
    } catch (error) {
      const sanitizedError = sanitizeError(error as Error);
      console.error('Error closing database pool:', sanitizedError);
      throw error;
    }
  }
}