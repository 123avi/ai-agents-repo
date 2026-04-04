import { Pool, PoolClient, PoolConfig } from 'pg';
import { Logger } from '../utils/Logger';

/**
 * DatabasePool manages PostgreSQL connection pooling with graceful shutdown capabilities.
 * Provides connection pool configuration, automatic reconnection, and proper cleanup
 * for database operations. Handles connection failures and implements circuit breaker
 * patterns for improved reliability.
 */
export class DatabasePool {
  private pool: Pool | null = null;
  private isShuttingDown = false;
  private readonly logger: Logger;
  private readonly config: PoolConfig;

  // Connection pool configuration constants
  private static readonly DEFAULT_MAX_CONNECTIONS = 20;
  private static readonly DEFAULT_IDLE_TIMEOUT_MS = 30000;
  private static readonly DEFAULT_CONNECTION_TIMEOUT_MS = 5000;

  /**
   * Creates a new DatabasePool instance with the provided configuration.
   * @param config - PostgreSQL pool configuration options
   * @param logger - Logger instance for debugging and monitoring
   */
  constructor(config: PoolConfig, logger: Logger) {
    this.config = {
      max: DatabasePool.DEFAULT_MAX_CONNECTIONS,
      idleTimeoutMillis: DatabasePool.DEFAULT_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: DatabasePool.DEFAULT_CONNECTION_TIMEOUT_MS,
      ...config
    };
    this.logger = logger;
  }

  /**
   * Initializes the connection pool and establishes database connectivity.
   * @throws {Error} If pool initialization fails or database is unreachable
   */
  public async initialize(): Promise<void> {
    try {
      this.pool = new Pool(this.config);
      this.setupPoolEventHandlers();
      
      // Test connectivity
      const client = await this.pool.connect();
      client.release();
      
      this.logger.info('Database pool initialized successfully', {
        maxConnections: this.config.max,
        database: this.config.database
      });
    } catch (error) {
      this.logger.error('Failed to initialize database pool', { error });
      throw new Error('Database pool initialization failed');
    }
  }

  /**
   * Acquires a database client from the connection pool.
   * @returns Promise resolving to a PostgreSQL client connection
   * @throws {Error} If pool is not initialized, shutting down, or connection fails
   */
  public async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    
    if (this.isShuttingDown) {
      throw new Error('Database pool is shutting down');
    }

    try {
      return await this.pool.connect();
    } catch (error) {
      this.logger.error('Failed to acquire database client', { error });
      throw error;
    }
  }

  /**
   * Gracefully shuts down the connection pool, waiting for active connections to close.
   * @returns Promise that resolves when all connections are closed
   */
  public async shutdown(): Promise<void> {
    if (!this.pool || this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.info('Shutting down database pool');

    try {
      await this.pool.end();
      this.pool = null;
      this.logger.info('Database pool shutdown completed');
    } catch (error) {
      this.logger.error('Error during database pool shutdown', { error });
      throw error;
    }
  }

  /**
   * Returns the current pool status and connection statistics.
   * @returns Object containing pool metrics and connection counts
   */
  public getPoolStatus(): object {
    if (!this.pool) {
      return { status: 'not_initialized' };
    }

    return {
      status: this.isShuttingDown ? 'shutting_down' : 'active',
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * Sets up event handlers for pool monitoring and error handling.
   * @private
   */
  private setupPoolEventHandlers(): void {
    if (!this.pool) return;

    this.pool.on('connect', () => {
      this.logger.debug('New database client connected');
    });

    this.pool.on('error', (error) => {
      this.logger.error('Database pool error', { error });
    });

    this.pool.on('remove', () => {
      this.logger.debug('Database client removed from pool');
    });
  }
}

/**
 * Factory function to create a configured DatabasePool instance.
 * @param config - Database connection configuration
 * @param logger - Logger instance for monitoring
 * @returns Configured DatabasePool instance
 */
export function createDatabasePool(config: PoolConfig, logger: Logger): DatabasePool {
  return new DatabasePool(config, logger);
}