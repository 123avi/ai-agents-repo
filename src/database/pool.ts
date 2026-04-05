import { Pool, PoolClient } from 'pg';
import { getDatabaseConfig } from './config';
import { logger } from '../utils/logger';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

let pool: Pool | null = null;

/**
 * Creates and configures the PostgreSQL connection pool
 * @returns Promise that resolves to the configured pool
 */
export async function createDatabasePool(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  try {
    const config = getDatabaseConfig();
    pool = new Pool(config);

    // Handle pool errors with graceful degradation
    pool.on('error', (err: Error) => {
      logger.error('Database pool error:', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      // Let the application handle graceful degradation instead of crashing
    });

    // Test the connection with retry logic
    await testConnectionWithRetry(pool);
    
    logger.info('Database pool created successfully');
    return pool;
  } catch (error) {
    logger.error('Failed to create database pool:', error);
    throw error;
  }
}

/**
 * Tests database connection with retry logic
 * @param poolInstance - The pool instance to test
 */
async function testConnectionWithRetry(poolInstance: Pool): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const client = await poolInstance.connect();
      await client.query('SELECT 1');
      client.release();
      logger.info(`Database connection test successful on attempt ${attempt}`);
      return;
    } catch (error) {
      logger.warn(`Database connection attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_RETRY_ATTEMPTS) {
        throw new Error(`Database connection failed after ${MAX_RETRY_ATTEMPTS} attempts`);
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }
}

/**
 * Gets the database pool instance
 * @returns The pool instance or throws if not initialized
 */
export function getDatabasePool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call createDatabasePool() first.');
  }
  return pool;
}

/**
 * Checks database connection health
 * @returns Promise that resolves to connection status
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; message: string }> {
  try {
    const poolInstance = getDatabasePool();
    const client = await poolInstance.connect();
    
    try {
      await client.query('SELECT 1');
      return { healthy: true, message: 'Database connection healthy' };
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Database health check failed:', error);
    return { 
      healthy: false, 
      message: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

/**
 * Gracefully closes the database pool
 */
export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}