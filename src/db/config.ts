import { Pool } from 'pg';

/**
 * Minimum number of connections in the pool as per NFR requirements
 */
const MIN_POOL_SIZE = 20;

/**
 * Maximum number of connections in the pool
 */
const MAX_POOL_SIZE = 50;

/**
 * Connection timeout in milliseconds
 */
const CONNECTION_TIMEOUT = 30000;

/**
 * Idle timeout in milliseconds
 */
const IDLE_TIMEOUT = 10000;

let pool: Pool | null = null;

/**
 * Creates and configures a PostgreSQL connection pool
 * @returns {Pool} Configured database connection pool
 * @throws {Error} When DATABASE_URL environment variable is not set
 */
export function createPool(): Pool {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  try {
    pool = new Pool({
      connectionString: databaseUrl,
      min: MIN_POOL_SIZE,
      max: MAX_POOL_SIZE,
      connectionTimeoutMillis: CONNECTION_TIMEOUT,
      idleTimeoutMillis: IDLE_TIMEOUT,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });

    return pool;
  } catch (error) {
    console.error('Failed to create database pool:', error);
    throw error;
  }
}

/**
 * Checks the health of database connections
 * @returns {Promise<boolean>} True if database connection is healthy
 */
export async function checkConnectionHealth(): Promise<boolean> {
  const currentPool = createPool();
  
  try {
    const client = await currentPool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Gracefully shuts down the database connection pool
 * @returns {Promise<void>}
 */
export async function closePool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      console.log('Database pool closed successfully');
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw error;
    }
  }
}