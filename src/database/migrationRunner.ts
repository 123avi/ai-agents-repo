import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

const MIGRATION_TABLE = 'schema_migrations';
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const ROLLBACK_DIR = path.join(MIGRATIONS_DIR, 'rollback');

/**
 * Database migration runner with rollback support
 */
export class MigrationRunner {
  constructor(private pool: Pool) {}

  /**
   * Initialize migration tracking table
   */
  private async createMigrationTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.pool.query(query);
  }

  /**
   * Get list of applied migrations
   */
  private async getAppliedMigrations(): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT filename FROM ${MIGRATION_TABLE} ORDER BY id`
    );
    return result.rows.map(row => row.filename);
  }

  /**
   * Execute a single migration file
   */
  private async executeMigration(filename: string): Promise<void> {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const sql = await fs.readFile(filePath, 'utf8');
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO ${MIGRATION_TABLE} (filename) VALUES ($1)`,
        [filename]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    await this.createMigrationTable();
    
    const migrationFiles = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    const appliedMigrations = await this.getAppliedMigrations();
    
    for (const filename of sqlFiles) {
      if (!appliedMigrations.includes(filename)) {
        console.log(`Running migration: ${filename}`);
        await this.executeMigration(filename);
      }
    }
  }

  /**
   * Rollback the last applied migration
   */
  async rollbackLastMigration(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    if (appliedMigrations.length === 0) {
      throw new Error('No migrations to rollback');
    }

    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    const rollbackFile = path.join(ROLLBACK_DIR, lastMigration);
    
    try {
      const sql = await fs.readFile(rollbackFile, 'utf8');
      
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `DELETE FROM ${MIGRATION_TABLE} WHERE filename = $1`,
          [lastMigration]
        );
        await client.query('COMMIT');
        console.log(`Rolled back migration: ${lastMigration}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      throw new Error(`Rollback file not found: ${rollbackFile}`);
    }
  }
}