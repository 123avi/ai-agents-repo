import { Pool, PoolConfig, PoolClient } from 'pg';
import { config } from '../config/database';
import { logger } from '../utils/logger';

/** Database connection pool configuration constants */
const POOL_CONFIG = {
  MIN_CONNECTIONS: 5,
  MAX_CONNECTIONS: 20,
  IDLE_TIMEOUT_MS: 30000,
  CONNECTION_TIMEOUT_MS: 5000,
  STATEMENT_TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000
} as const;

/** PostgreSQL connection pool for the application */
class DatabasePool {
  private pool: Pool;
  private isShuttingDown: boolean = false;

  constructor() {
    this.pool = this.createPool();
    this.setupEventListeners();
  }

  /**
   * Creates a new PostgreSQL connection pool with configured settings
   * @returns Configured Pool instance
   */
  private createPool(): Pool {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      min: POOL_CONFIG.MIN_CONNECTIONS,
      max: POOL_CONFIG.MAX_CONNECTIONS,
      idleTimeoutMillis: POOL_CONFIG.IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: POOL_CONFIG.CONNECTION_TIMEOUT_MS,
      statement_timeout: POOL_CONFIG.STATEMENT_TIMEOUT_MS
    };

    return new Pool(poolConfig);
  }

  /**
   * Sets up event listeners for pool monitoring and error handling
   */
  private setupEventListeners(): void {
    this.pool.on('connect', (client: PoolClient) => {
      logger.info('New database client connected');
    });

    this.pool.on('error', (err: Error) => {
      logger.error('Unexpected error on idle client', err);
    });

    this.pool.on('remove', () => {
      logger.info('Database client removed from pool');
    });
  }

  /**
   * Gets a database client from the pool with retry logic
   * @returns Promise resolving to a PoolClient
   * @throws Error if connection fails after all retries
   */
  async getClient(): Promise<PoolClient> {
    if (this.isShuttingDown) {
      throw new Error('Database pool is shutting down');
    }

    let retries = 0;
    while (retries < POOL_CONFIG.MAX_RETRIES) {
      try {
        const client = await this.pool.connect();
        return client;
      } catch (error) {
        retries++;
        logger.error(`Database connection attempt ${retries} failed:`, error);
        
        if (retries === POOL_CONFIG.MAX_RETRIES) {
          throw new Error(`Failed to connect to database after ${POOL_CONFIG.MAX_RETRIES} attempts`);
        }
        
        await this.delay(POOL_CONFIG.RETRY_DELAY_MS * retries);
      }
    }
    
    throw new Error('Unexpected error in connection retry logic');
  }

  /**
   * Executes a query with automatic client management and retry logic
   * @param text SQL query string
   * @param params Query parameters
   * @returns Promise resolving to query result
   */
  async query(text: string, params?: unknown[]): Promise<any> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      logger.error('Database query failed:', { text, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gracefully closes the database connection pool
   */
  async close(): Promise<void> {
    this.isShuttingDown = true;
    try {
      await this.pool.end();
      logger.info('Database pool closed successfully');
    } catch (error) {
      logger.error('Error closing database pool:', error);
      throw error;
    }
  }

  /**
   * Gets current pool statistics for monitoring
   * @returns Pool statistics object
   */
  getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * Utility method to delay execution
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/** Singleton database pool instance */
export const databasePool = new DatabasePool();

/** Export query function for direct use */
export const query = databasePool.query.bind(databasePool);

/** Export getClient function for transaction support */
export const getClient = databasePool.getClient.bind(databasePool);

/** Export close function for graceful shutdown */
export const closePool = databasePool.close.bind(databasePool);

/** Export stats function for monitoring */
export const getPoolStats = databasePool.getStats.bind(databasePool);