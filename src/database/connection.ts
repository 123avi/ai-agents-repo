import { Pool } from 'pg';
import { config } from '../config/database';

const DB_MIN_POOL_SIZE = 2;
const DB_MAX_POOL_SIZE = 20;
const DB_IDLE_TIMEOUT_MS = 30000;
const DB_CONNECTION_TIMEOUT_MS = 2000;

/**
 * PostgreSQL connection pool instance
 * Provides connection pooling for database operations
 */
export class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor() {
    this.pool = new Pool({
      connectionString: config.connectionString,
      min: DB_MIN_POOL_SIZE,
      max: DB_MAX_POOL_SIZE,
      idleTimeoutMillis: DB_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  /**
   * Get singleton instance of database connection
   * @returns DatabaseConnection instance
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Get database pool for queries
   * @returns PostgreSQL connection pool
   */
  public getPool(): Pool {
    return this.pool;
  }

  /**
   * Close all database connections
   * @returns Promise that resolves when connections are closed
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = DatabaseConnection.getInstance().getPool();