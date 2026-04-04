import { Pool, PoolConfig } from 'pg';

// Database connection constants
const DEFAULT_PORT = 5432;
const DEFAULT_HOST = 'localhost';
const DEFAULT_DATABASE = 'todos_db';
const MIN_POOL_SIZE = 5;
const MAX_POOL_SIZE = 20;
const CONNECTION_TIMEOUT_MS = 30000;
const IDLE_TIMEOUT_MS = 10000;

/**
 * Creates and configures database connection pool
 * @returns Configured PostgreSQL connection pool
 * @throws Error if required environment variables are missing
 */
export function createDatabasePool(): Pool {
  const config: PoolConfig = {
    host: process.env.DB_HOST || DEFAULT_HOST,
    port: parseInt(process.env.DB_PORT || String(DEFAULT_PORT)),
    database: process.env.DB_NAME || DEFAULT_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    min: MIN_POOL_SIZE,
    max: MAX_POOL_SIZE,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: IDLE_TIMEOUT_MS
  };

  // Validate required environment variables
  if (!config.user) {
    throw new Error('DB_USER environment variable is required');
  }
  
  if (!config.password) {
    throw new Error('DB_PASSWORD environment variable is required');
  }

  return new Pool(config);
}

/**
 * Gracefully closes database connection pool
 * @param pool Database connection pool to close
 */
export async function closeDatabasePool(pool: Pool): Promise<void> {
  try {
    await pool.end();
    console.log('Database connection pool closed successfully');
  } catch (error) {
    console.error('Error closing database connection pool:', error);
    throw error;
  }
}