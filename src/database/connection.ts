import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../utils/logger';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

/**
 * PostgreSQL database connection wrapper
 */
export class DatabaseConnection {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Executes SQL query with parameters
   * @param text SQL query string
   * @param params Query parameters
   * @returns Query result
   */
  async query(text: string, params?: any[]): Promise<QueryResult> {
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Gets database client for transaction handling
   * @returns Database client
   */
  async getClient(): Promise<PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error) {
      logger.error('Database client connection error:', error);
      throw error;
    }
  }

  /**
   * Closes database connection pool
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }
}