import { Pool } from 'pg';

/**
 * Database configuration constants
 */
const DB_MIN_CONNECTIONS = 20;
const DB_MAX_CONNECTIONS = 100;
const DB_IDLE_TIMEOUT_MS = 30000;
const DB_CONNECTION_TIMEOUT_MS = 2000;

/**
 * Validates and extracts DATABASE_URL from environment
 * @throws {Error} If DATABASE_URL is not provided or empty
 */
function validateDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString || connectionString.trim().length === 0) {
    throw new Error('DATABASE_URL environment variable is required and cannot be empty');
  }
  
  return connectionString.trim();
}

/**
 * Database configuration object with validated connection string
 */
export const DB_CONFIG = {
  connectionString: validateDatabaseUrl(),
  min: DB_MIN_CONNECTIONS,
  max: DB_MAX_CONNECTIONS,
  idleTimeoutMillis: DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
};

/**
 * Global connection pool instance
 */
let connectionPool: Pool | null = null;

/**
 * Gets or creates the database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
export function getConnectionPool(): Pool {
  if (!connectionPool) {
    connectionPool = new Pool(DB_CONFIG);
    
    connectionPool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }
  
  return connectionPool;
}

/**
 * Checks the health of database connections
 * @returns {Promise<boolean>} True if connection is healthy, false otherwise
 */
export async function checkConnectionHealth(): Promise<boolean> {
  const pool = getConnectionPool();
  let client;
  
  try {
    client = await pool.connect();
    const result = await client.query('SELECT 1 as health_check');
    return result.rows.length > 0 && result.rows[0].health_check === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Gracefully closes the connection pool
 * @returns {Promise<void>} Promise that resolves when pool is closed
 */
export async function closeConnectionPool(): Promise<void> {
  if (connectionPool) {
    try {
      await connectionPool.end();
      console.log('Database connection pool closed successfully');
    } catch (error) {
      console.error('Error closing connection pool:', error);
      throw error;
    } finally {
      connectionPool = null;
    }
  }
}