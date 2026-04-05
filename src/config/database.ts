import { Pool, PoolConfig } from 'pg';
import { config } from './environment';

const MAX_POOL_SIZE = 20;
const MIN_POOL_SIZE = 2;
const CONNECTION_TIMEOUT_MS = 30000;
const IDLE_TIMEOUT_MS = 300000;
const STATEMENT_TIMEOUT_MS = 10000;

/**
 * PostgreSQL connection pool configuration
 * Manages database connections for high-concurrency scenarios
 */
const poolConfig: PoolConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: MAX_POOL_SIZE,
  min: MIN_POOL_SIZE,
  connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: IDLE_TIMEOUT_MS,
  statement_timeout: STATEMENT_TIMEOUT_MS,
  ssl: config.database.ssl ? {
    rejectUnauthorized: false
  } : false
};

/**
 * Global database connection pool instance
 */
export const pool = new Pool(poolConfig);

/**
 * Tests database connectivity and returns connection status
 * @returns Promise resolving to connection health information
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  };
}> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    return {
      status: 'healthy',
      details: {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount
      }
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      details: {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount
      }
    };
  }
}

/**
 * Gracefully closes all database connections
 * Call this during application shutdown
 */
export async function closeDatabasePool(): Promise<void> {
  try {
    await pool.end();
    console.log('Database pool closed successfully');
  } catch (error) {
    console.error('Error closing database pool:', error);
    throw error;
  }
}

// Handle pool errors to prevent application crashes
pool.on('error', (error) => {
  console.error('Unexpected database pool error:', error);
});

pool.on('connect', () => {
  console.log('New database connection established');
});

pool.on('remove', () => {
  console.log('Database connection removed from pool');
});