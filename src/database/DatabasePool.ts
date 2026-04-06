import { Pool, PoolConfig } from 'pg';
import { Logger } from '../utils/Logger';

const DEFAULT_POOL_SIZE = 20;
const DEFAULT_IDLE_TIMEOUT = 30000;
const DEFAULT_CONNECTION_TIMEOUT = 2000;

/**
 * Database connection pool manager with configuration and health checking
 */
export class DatabasePool {
  private static instance: DatabasePool;
  private pool: Pool;
  private readonly logger = Logger.getInstance();

  private constructor() {
    const config: PoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'todoapi',
      user: process.env.DB_USER || 'todouser',
      password: process.env.DB_PASSWORD || 'todopass',
      max: parseInt(process.env.DB_POOL_SIZE || DEFAULT_POOL_SIZE.toString()),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || DEFAULT_IDLE_TIMEOUT.toString()),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || DEFAULT_CONNECTION_TIMEOUT.toString()),
    };

    this.pool = new Pool(config);
    this.setupEventHandlers();
  }

  /**
   * Get singleton instance of DatabasePool
   */
  public static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  /**
   * Get database connection pool
   */
  public getPool(): Pool {
    return this.pool;
  }

  /**
   * Test database connection health
   */
  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.logger.info('Database connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Database connection test failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Close all database connections
   */
  public async close(): Promise<void> {
    try {
      await this.pool.end();
      this.logger.info('Database pool closed');
    } catch (error) {
      this.logger.error('Error closing database pool', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.pool.on('error', (error) => {
      this.logger.error('Database pool error', { error: error.message });
    });

    this.pool.on('connect', () => {
      this.logger.debug('New database client connected');
    });

    this.pool.on('remove', () => {
      this.logger.debug('Database client removed from pool');
    });
  }
}