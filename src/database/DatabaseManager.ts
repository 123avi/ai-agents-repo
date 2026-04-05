import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config/config';

/**
 * Database connection and query management
 * Provides connection pooling and basic query operations
 */
export class DatabaseManager {
  private pool: Pool;
  private static instance: DatabaseManager;

  private constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: config.database.maxConnections,
      idleTimeoutMillis: config.database.idleTimeout,
      connectionTimeoutMillis: config.database.connectionTimeout,
    });
  }

  /**
   * Get singleton instance of DatabaseManager
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Execute a parameterized query
   */
  public async query(text: string, params?: any[]): Promise<QueryResult> {
    const client = await this.pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  /**
   * Get a database client for transactions
   */
  public async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Close all database connections
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }
}