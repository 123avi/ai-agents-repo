import { Pool, PoolConfig, PoolClient } from 'pg';
import { EventEmitter } from 'events';

/**
 * Configuration interface for database connection pool
 */
export interface DatabaseConfig {
  /** Database host address */
  host: string;
  /** Database port number */
  port: number;
  /** Database name */
  database: string;
  /** Database username */
  user: string;
  /** Database password */
  password: string;
  /** Maximum number of connections in pool */
  maxConnections: number;
  /** Connection timeout in milliseconds */
  connectionTimeoutMillis: number;
  /** Idle timeout in milliseconds */
  idleTimeoutMillis: number;
}

/**
 * Database connection pool manager with graceful shutdown support
 */
export class DatabasePool extends EventEmitter {
  private pool: Pool | null = null;
  private isShuttingDown = false;

  /**
   * Initialize the database connection pool
   * @param config - Database configuration
   */
  async connect(config: DatabaseConfig): Promise<void> {
    if (this.pool) {
      throw new Error('Database pool already initialized');
    }

    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.maxConnections,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
      idleTimeoutMillis: config.idleTimeoutMillis,
    };

    this.pool = new Pool(poolConfig);
    this.setupEventHandlers();

    // Test connection
    await this.testConnection();
    this.emit('connected');
  }

  /**
   * Get a client from the connection pool
   * @returns Promise resolving to database client
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool || this.isShuttingDown) {
      throw new Error('Database pool not available');
    }
    return this.pool.connect();
  }

  /**
   * Execute a query using the connection pool
   * @param text - SQL query text
   * @param params - Query parameters
   * @returns Query result
   */
  async query(text: string, params?: any[]) {
    const client = await this.getClient();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  /**
   * Gracefully shutdown the connection pool
   */
  async shutdown(): Promise<void> {
    if (!this.pool || this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.emit('shutting_down');

    await this.pool.end();
    this.pool = null;
    this.emit('shutdown_complete');
  }

  /**
   * Get pool status information
   */
  getPoolStatus() {
    if (!this.pool) {
      return { totalCount: 0, idleCount: 0, waitingCount: 0 };
    }
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  private async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } catch (error) {
      throw new Error(`Database connection test failed: ${error}`);
    } finally {
      client.release();
    }
  }

  private setupEventHandlers(): void {
    if (!this.pool) return;

    this.pool.on('error', (err) => {
      this.emit('error', err);
    });

    this.pool.on('connect', () => {
      this.emit('client_connected');
    });
  }
}

// Default database pool instance
export const dbPool = new DatabasePool();