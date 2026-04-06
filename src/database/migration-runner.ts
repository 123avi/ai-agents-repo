import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const MIGRATION_TABLE = 'schema_migrations';

/**
 * Database migration runner for executing SQL schema changes
 */
export class MigrationRunner {
  private pool: Pool;
  private migrationDir: string;

  constructor(pool: Pool, migrationDir = 'migrations') {
    this.pool = pool;
    this.migrationDir = migrationDir;
  }

  /**
   * Initialize migration tracking table
   */
  private async initializeMigrationTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await this.pool.query(query);
  }

  /**
   * Get list of executed migrations
   */
  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await this.pool.query(
        `SELECT version FROM ${MIGRATION_TABLE} ORDER BY version`
      );
      return result.rows.map(row => row.version);
    } catch (error) {
      return [];
    }
  }

  /**
   * Execute a single migration file
   */
  private async executeMigration(filename: string): Promise<void> {
    const filePath = path.join(this.migrationDir, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO ${MIGRATION_TABLE} (version) VALUES ($1)`,
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
    await this.initializeMigrationTable();
    
    const executedMigrations = await this.getExecutedMigrations();
    const migrationFiles = fs
      .readdirSync(this.migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );

    for (const migration of pendingMigrations) {
      console.log(`Executing migration: ${migration}`);
      await this.executeMigration(migration);
      console.log(`Completed migration: ${migration}`);
    }

    console.log(`Executed ${pendingMigrations.length} migrations`);
  }
}