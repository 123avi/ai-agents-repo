import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || 'todo_user';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'todo_db';
const DATABASE_URL = process.env.DATABASE_URL || 
  `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

const MAX_POOL_SIZE = 20;
const MIN_POOL_SIZE = 2;
const CONNECTION_TIMEOUT_MS = 30000;
const IDLE_TIMEOUT_MS = 10000;

/**
 * Database connection pool configuration and management
 * Provides connection pooling for PostgreSQL database with health monitoring
 */
export class DatabasePool {
  private static instance: DatabasePool;
  private pool: Pool;

  private constructor() {
    const config: PoolConfig = {
      connectionString: DATABASE_URL,
      max: MAX_POOL_SIZE,
      min: MIN_POOL_SIZE,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
      idleTimeoutMillis: IDLE_TIMEOUT_MS,
    };

    this.pool = new Pool(config);
    this.setupPoolEventHandlers();
  }

  /**
   * Get singleton instance of database pool
   * @returns DatabasePool instance
   */
  public static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  /**
   * Get database connection pool
   * @returns PostgreSQL connection pool
   */
  public getPool(): Pool {
    return this.pool;
  }

  /**
   * Test database connection and return detailed status
   * @returns Promise with connection status and error details
   */
  public async testConnection(): Promise<{ connected: boolean; error?: string; details?: any }> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      logger.info('Database connection test successful');
      return { connected: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = {
        code: error instanceof Error && 'code' in error ? error.code : undefined,
        host: DB_HOST,
        port: DB_PORT,
        database: DB_NAME,
        user: DB_USER
      };
      
      logger.error('Database connection test failed', { error: errorMessage, details: errorDetails });
      return { 
        connected: false, 
        error: errorMessage,
        details: errorDetails
      };
    }
  }

  private setupPoolEventHandlers(): void {
    this.pool.on('error', (err) => {
      logger.error('Database pool error', { error: err.message });
    });

    this.pool.on('connect', () => {
      logger.debug('New database connection established');
    });
  }

  /**
   * Close all database connections
   */
  public async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }
}

export const db = DatabasePool.getInstance();