/**
 * Database connection pool module
 * Provides PostgreSQL connection pooling with retry logic and monitoring
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { DatabaseConfig, getDatabaseConfig, validateDatabaseConfig } from './config';

/** Pool statistics interface for monitoring */
export interface PoolStats {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  configuration: {
    minConnections: number;
    maxConnections: number;
    idleTimeoutMillis: number;
    host: string;
    database: string;
  };
  health: {
    isHealthy: boolean;
    lastConnectionTest?: Date;
    errorCount: number;
  };
}

/** Database connection pool class */
export class DatabasePool {
  private pool: Pool;
  private config: DatabaseConfig;
  private errorCount: number = 0;
  private lastConnectionTest?: Date;

  constructor() {
    this.config = getDatabaseConfig();
    validateDatabaseConfig(this.config);
    
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      min: this.config.minConnections,
      max: this.config.maxConnections,
      idleTimeoutMillis: this.config.idleTimeoutMillis
    });

    this.setupErrorHandlers();
  }

  /**
   * Sets up error handlers for the connection pool
   */
  private setupErrorHandlers(): void {
    this.pool.on('error', (err: Error) => {
      this.errorCount++;
      console.error('Database pool error:', err);
    });

    this.pool.on('connect', () => {
      this.lastConnectionTest = new Date();
    });
  }

  /**
   * Executes a SQL query with retry logic
   * @param text - SQL query string
   * @param params - Query parameters
   * @returns Promise resolving to query result
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.pool.query<T>(text, params);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.errorCount++;
        
        console.error(`Query attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
    
    throw lastError!;
  }

  /**
   * Gets a client from the connection pool
   * @returns Promise resolving to a database client
   */
  async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();
      this.lastConnectionTest = new Date();
      return client;
    } catch (error) {
      this.errorCount++;
      console.error('Failed to get database client:', error);
      throw error;
    }
  }

  /**
   * Gets connection pool statistics for monitoring
   * @returns PoolStats object with pool metrics and health information
   */
  getPoolStats(): PoolStats {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      configuration: {
        minConnections: this.config.minConnections,
        maxConnections: this.config.maxConnections,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        host: this.config.host,
        database: this.config.database
      },
      health: {
        isHealthy: this.errorCount < 10 && this.pool.totalCount > 0,
        lastConnectionTest: this.lastConnectionTest,
        errorCount: this.errorCount
      }
    };
  }

  /**
   * Closes all connections in the pool
   * @returns Promise that resolves when pool is closed
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('Database pool closed successfully');
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw error;
    }
  }

  /**
   * Utility method for adding delays
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
let poolInstance: DatabasePool;

/**
 * Gets the singleton database pool instance
 * @returns DatabasePool instance
 */
export function getPool(): DatabasePool {
  if (!poolInstance) {
    poolInstance = new DatabasePool();
  }
  return poolInstance;
}