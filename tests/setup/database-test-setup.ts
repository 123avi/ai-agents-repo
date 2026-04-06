import { Client } from 'pg';
import { config } from '../../src/config';

/**
 * Database test setup utilities
 * Handles test database initialization and cleanup
 */
export class DatabaseTestSetup {
  private static client: Client;
  
  /**
   * Initialize test database connection
   * Creates connection pool for test database
   */
  public static async initialize(): Promise<void> {
    try {
      this.client = new Client({
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
      });
      
      await this.client.connect();
      await this.createTestSchema();
    } catch (error) {
      console.error('Failed to initialize test database:', error);
      throw error;
    }
  }
  
  /**
   * Create test database schema if it doesn't exist
   * Ensures all required tables and constraints are present
   */
  private static async createTestSchema(): Promise<void> {
    try {
      // Create users table
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create todos table with constraints
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          due_date TIMESTAMP,
          status VARCHAR(10) DEFAULT 'open' CHECK (status IN ('open', 'done')),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Add indexes for performance
      await this.client.query(`
        CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id)
      `);
      
      await this.client.query(`
        CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)
      `);
    } catch (error) {
      console.error('Failed to create test schema:', error);
      throw error;
    }
  }
  
  /**
   * Clean up test data
   * Removes all test records from database
   */
  public static async cleanup(): Promise<void> {
    try {
      if (this.client) {
        await this.client.query('DELETE FROM todos WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test-%\')');
        await this.client.query('DELETE FROM users WHERE email LIKE \'test-%\'');
      }
    } catch (error) {
      console.error('Failed to cleanup test data:', error);
      throw error;
    }
  }
  
  /**
   * Close database connection
   * Terminates connection pool for test cleanup
   */
  public static async teardown(): Promise<void> {
    try {
      if (this.client) {
        await this.client.end();
      }
    } catch (error) {
      console.error('Failed to teardown test database:', error);
      throw error;
    }
  }
  
  /**
   * Get database client for direct queries in tests
   * @returns PostgreSQL client instance
   */
  public static getClient(): Client {
    return this.client;
  }
}