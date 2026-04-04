import { Pool, PoolClient } from 'pg';
import { DB_CONFIG, validateDatabaseConfig } from '../config/database.js';
import { logger, logDatabaseEvent, logDatabaseError } from '../utils/logger.js';

/** Global connection pool instance */
let pool: Pool | null = null;

/** Connection health check timeout in milliseconds */
const HEALTH_CHECK_TIMEOUT = 5000;

/** Simple query used for health checks */
const HEALTH_CHECK_QUERY = 'SELECT 1 as health';

/**
 * Creates and configures a PostgreSQL connection pool
 * Validates configuration and sets up connection pool with NFR requirements
 * @returns {Pool} Configured PostgreSQL connection pool
 * @throws {Error} If configuration is invalid or pool creation fails
 */
export function createConnectionPool(): Pool {
  try {
    validateDatabaseConfig();
    
    pool = new Pool(DB_CONFIG);
    
    pool.on('connect', (client: PoolClient) => {
      logDatabaseEvent('pool_connect', { 
        totalCount: pool?.totalCount || 0,
        idleCount: pool?.idleCount || 0
      });
    });
    
    pool.on('error', (error: Error) => {
      logDatabaseError('pool_error', error);
    });
    
    logDatabaseEvent('pool_created', {
      minConnections: DB_CONFIG.min,
      maxConnections: DB_CONFIG.max
    });
    
    return pool;
  } catch (error) {
    const err = error as Error;
    logDatabaseError('pool_creation_failed', err);
    throw new Error(`Failed to create connection pool: ${err.message}`);
  }
}

/**
 * Gets the existing connection pool or creates a new one
 * Ensures singleton pattern for connection pool management
 * @returns {Pool} Active PostgreSQL connection pool
 */
export function getConnectionPool(): Pool {
  if (!pool) {
    pool = createConnectionPool();
  }
  return pool;
}

/**
 * Performs a health check on the database connection
 * Tests connectivity and measures response time
 * @returns {Promise<boolean>} True if connection is healthy, false otherwise
 */
export async function checkConnectionHealth(): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    const currentPool = getConnectionPool();
    const client = await currentPool.connect();
    
    try {
      await client.query(HEALTH_CHECK_QUERY);
      const responseTime = Date.now() - startTime;
      
      logDatabaseEvent('health_check_success', {
        responseTimeMs: responseTime,
        totalConnections: currentPool.totalCount,
        idleConnections: currentPool.idleCount
      });
      
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    const err = error as Error;
    const responseTime = Date.now() - startTime;
    
    logDatabaseError('health_check_failed', err, {
      responseTimeMs: responseTime
    });
    
    return false;
  }
}

/**
 * Gracefully closes the connection pool
 * Waits for active connections to complete before shutting down
 * @returns {Promise<void>} Resolves when pool is closed successfully
 */
export async function closeConnectionPool(): Promise<void> {
  if (!pool) {
    logDatabaseEvent('pool_close_skipped', { reason: 'No active pool' });
    return;
  }
  
  try {
    const activeConnections = pool.totalCount;
    const idleConnections = pool.idleCount;
    
    logDatabaseEvent('pool_closing', {
      activeConnections,
      idleConnections
    });
    
    await pool.end();
    pool = null;
    
    logDatabaseEvent('pool_closed_successfully');
  } catch (error) {
    const err = error as Error;
    logDatabaseError('pool_close_failed', err);
    throw new Error(`Failed to close connection pool: ${err.message}`);
  }
}