import { Pool } from 'pg';
import { logger } from '../utils/logger';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME = process.env.DB_NAME || 'todoapp';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
const MAX_POOL_SIZE = parseInt(process.env.DB_MAX_POOL_SIZE || '10', 10);

/**
 * PostgreSQL connection pool configuration
 */
export const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: MAX_POOL_SIZE,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Initializes database connection and handles connection events
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection
    const client = await pool.connect();
    logger.info('Database connection established successfully');
    client.release();
  } catch (error) {
    logger.error('Failed to connect to database', { error: error.message });
    throw error;
  }

  // Handle pool events
  pool.on('error', (error) => {
    logger.error('Unexpected database pool error', { error: error.message });
  });

  pool.on('connect', () => {
    logger.debug('New database client connected');
  });
}