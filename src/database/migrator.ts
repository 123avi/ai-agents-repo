import { DatabaseConnection } from './connection';
import { logger } from '../utils/logger';

export interface Migration {
  id: string;
  up: string;
  down: string;
}

/**
 * Database migration manager with rollback support
 */
export class DatabaseMigrator {
  constructor(private db: DatabaseConnection) {}

  /**
   * Runs a migration and tracks it in the migrations table
   */
  async runMigration(migration: Migration): Promise<void> {
    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');
      
      // Execute the migration
      await client.query(migration.up);
      
      // Record the migration
      await client.query(
        'INSERT INTO schema_migrations (id, applied_at) VALUES ($1, NOW())',
        [migration.id]
      );
      
      await client.query('COMMIT');
      logger.info(`Migration ${migration.id} applied successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Migration ${migration.id} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rolls back a migration with error handling
   */
  async rollbackMigration(migration: Migration): Promise<void> {
    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');
      
      try {
        // Execute rollback SQL
        await client.query(migration.down);
      } catch (rollbackError) {
        logger.error(`Rollback SQL failed for ${migration.id}:`, rollbackError);
        await client.query('ROLLBACK');
        throw new Error(`Rollback failed: ${rollbackError.message}`);
      }
      
      // Remove migration record
      await client.query(
        'DELETE FROM schema_migrations WHERE id = $1',
        [migration.id]
      );
      
      await client.query('COMMIT');
      logger.info(`Migration ${migration.id} rolled back successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Rollback transaction failed for ${migration.id}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gets list of applied migrations
   */
  async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await this.db.query(
        'SELECT id FROM schema_migrations ORDER BY applied_at'
      );
      return result.rows.map((row: any) => row.id);
    } catch (error) {
      logger.error('Failed to get applied migrations:', error);
      throw error;
    }
  }

  /**
   * Creates the migrations tracking table if it doesn't exist
   */
  async initializeMigrationsTable(): Promise<void> {
    try {
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      logger.error('Failed to initialize migrations table:', error);
      throw error;
    }
  }
}