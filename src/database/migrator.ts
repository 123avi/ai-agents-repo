import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { db } from './connection';
import { migrationConfig } from '../config/database';

interface Migration {
  id: number;
  filename: string;
  sql: string;
}

/**
 * Database migration manager
 * Handles running and tracking database schema migrations
 */
export class Migrator {
  /**
   * Initialize migration tracking table
   */
  private async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${migrationConfig.migrationsTable} (
        id INTEGER PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    await db.query(sql);
  }

  /**
   * Get list of executed migrations
   * @returns Array of migration IDs that have been executed
   */
  private async getExecutedMigrations(): Promise<number[]> {
    const result = await db.query(
      `SELECT id FROM ${migrationConfig.migrationsTable} ORDER BY id`
    );
    return result.rows.map(row => row.id);
  }

  /**
   * Load migration files from filesystem
   * @returns Array of migration objects
   */
  private loadMigrationFiles(): Migration[] {
    const files = readdirSync(migrationConfig.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const idMatch = filename.match(/^(\d+)_/);
      if (!idMatch) {
        throw new Error(`Invalid migration filename: ${filename}`);
      }
      
      const id = parseInt(idMatch[1]);
      const filepath = join(migrationConfig.migrationsPath, filename);
      const sql = readFileSync(filepath, 'utf-8');
      
      return { id, filename, sql };
    });
  }

  /**
   * Run pending database migrations
   * @returns Number of migrations executed
   */
  public async runMigrations(): Promise<number> {
    await this.createMigrationsTable();
    
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = this.loadMigrationFiles();
    
    const pendingMigrations = allMigrations.filter(
      migration => !executedMigrations.includes(migration.id)
    );

    let executedCount = 0;
    
    for (const migration of pendingMigrations) {
      try {
        await db.query('BEGIN');
        
        await db.query(migration.sql);
        
        await db.query(
          `INSERT INTO ${migrationConfig.migrationsTable} (id, filename) VALUES ($1, $2)`,
          [migration.id, migration.filename]
        );
        
        await db.query('COMMIT');
        
        console.log(`Executed migration: ${migration.filename}`);
        executedCount++;
      } catch (error) {
        await db.query('ROLLBACK');
        console.error(`Failed to execute migration ${migration.filename}:`, error);
        throw error;
      }
    }

    return executedCount;
  }
}