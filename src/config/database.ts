import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://todo_user:todo_password@localhost:5432/todo_db';

/**
 * Database connection pool configuration
 * Provides singleton instance for application-wide database access
 */
class DatabasePool {
  private static instance: Pool;

  /**
   * Get the singleton database pool instance
   * @returns {Pool} PostgreSQL connection pool
   */
  public static getInstance(): Pool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new Pool({
        connectionString: DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
      });

      // Handle pool errors
      DatabasePool.instance.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        process.exit(-1);
      });
    }

    return DatabasePool.instance;
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>} Connection status
   */
  public static async testConnection(): Promise<boolean> {
    try {
      const pool = DatabasePool.getInstance();
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Close all database connections
   * @returns {Promise<void>}
   */
  public static async close(): Promise<void> {
    if (DatabasePool.instance) {
      await DatabasePool.instance.end();
    }
  }
}

export { DatabasePool };
export const db = DatabasePool.getInstance();