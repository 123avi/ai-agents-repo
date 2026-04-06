import { Pool } from 'pg';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME = process.env.DB_NAME || 'todoapp';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_MAX_CONNECTIONS = parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10);

/**
 * PostgreSQL database connection pool
 */
export class DatabaseConnection {
  private static instance: Pool;

  /**
   * Get singleton database pool instance
   */
  static getPool(): Pool {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new Pool({
        host: DB_HOST,
        port: DB_PORT,
        database: DB_NAME,
        user: DB_USER,
        password: DB_PASSWORD,
        max: DB_MAX_CONNECTIONS,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      DatabaseConnection.instance.on('error', (err) => {
        console.error('Database connection error:', err);
      });
    }

    return DatabaseConnection.instance;
  }

  /**
   * Close database connection pool
   */
  static async close(): Promise<void> {
    if (DatabaseConnection.instance) {
      await DatabaseConnection.instance.end();
    }
  }
}