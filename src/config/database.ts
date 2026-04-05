import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

/** Database connection configuration constants */
const DB_CONFIG = {
  MIN_CONNECTIONS: 2,
  MAX_CONNECTIONS: 20,
  IDLE_TIMEOUT_MS: 30000,
  CONNECTION_TIMEOUT_MS: 2000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000
} as const;

/** PostgreSQL connection pool configuration */
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  min: DB_CONFIG.MIN_CONNECTIONS,
  max: DB_CONFIG.MAX_CONNECTIONS,
  idleTimeoutMillis: DB_CONFIG.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: DB_CONFIG.CONNECTION_TIMEOUT_MS
};

/** PostgreSQL connection pool instance */
export const pool = new Pool(poolConfig);

/**
 * Performs database connection health check
 * @returns Promise<boolean> - true if connection is healthy
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('Database health check passed');
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Executes database query with connection retry logic
 * @param query - SQL query string
 * @param params - Query parameters
 * @returns Promise with query result
 */
export async function executeQuery(query: string, params?: any[]) {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= DB_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await pool.query(query, params);
      if (attempt > 1) {
        logger.info(`Database query succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Database query attempt ${attempt} failed:`, error);
      
      if (attempt < DB_CONFIG.RETRY_ATTEMPTS) {
        await sleep(DB_CONFIG.RETRY_DELAY_MS * attempt);
      }
    }
  }
  
  logger.error('Database query failed after all retry attempts:', lastError);
  throw lastError;
}

/**
 * Utility function to sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after specified time
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gracefully closes database connection pool
 * @returns Promise that resolves when pool is closed
 */
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database connection pool closed successfully');
  } catch (error) {
    logger.error('Error closing database connection pool:', error);
    throw error;
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await closePool();
});

process.on('SIGINT', async () => {
  await closePool();
});
