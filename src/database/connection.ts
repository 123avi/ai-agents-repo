import { Pool, PoolClient } from 'pg';
import { getDatabaseConfig, DatabaseConfig } from './config';

/**
 * Database connection pool singleton
 */
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private config: DatabaseConfig;

  private constructor() {
    this.config = getDatabaseConfig();
    this.pool = this.createPool();
    this.setupErrorHandling();
  }

  /**
   * Get singleton instance of database connection
   * @returns {DatabaseConnection} Database connection instance
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Create PostgreSQL connection pool
   * @returns {Pool} Configured connection pool
   */
  private createPool(): Pool {
    return new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      max: this.config.max,
      min: this.config.min
    });
  }

  /**
   * Setup error handling for connection pool
   */
  private setupErrorHandling(): void {
    this.pool.on('error', (err: Error) => {
      console.error('PostgreSQL pool error:', err);
    });

    this.pool.on('connect', () => {
      console.log('New client connected to PostgreSQL');
    });
  }

  /**
   * Get connection pool instance
   * @returns {Pool} Connection pool
   */
  public getPool(): Pool {
    return this.pool;
  }

  /**
   * Execute query with automatic connection handling
   * @param {string} text SQL query text
   * @param {any[]} params Query parameters
   * @returns {Promise<any>} Query result
   */
  public async query(text: string, params?: any[]): Promise<any> {
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Close all connections in the pool
   * @returns {Promise<void>}
   */
  public async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('Database connection pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw error;
    }
  }
}