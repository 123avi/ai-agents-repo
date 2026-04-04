import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Database migration runner that executes SQL migration files in order
 */
export class DatabaseMigrator {
  private pool: Pool;
  
  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Runs all pending database migrations
   * @returns Promise that resolves when all migrations complete
   * @throws Error if any migration fails
   */
  async runMigrations(): Promise<void> {
    try {
      await this.createMigrationsTable();
      const migrations = await this.getPendingMigrations();
      
      for (const migration of migrations) {
        await this.runMigration(migration);
      }
      
      console.log(`Successfully ran ${migrations.length} migrations`);
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Creates the migrations tracking table if it doesn't exist
   */
  private async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await this.pool.query(sql);
  }

  /**
   * Gets list of migrations that haven't been run yet
   * @returns Array of migration file information
   */
  private async getPendingMigrations(): Promise<MigrationInfo[]> {
    const availableMigrations = this.getAvailableMigrations();
    const result = await this.pool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    
    const executedVersions = new Set(result.rows.map(row => row.version));
    
    return availableMigrations.filter(migration => 
      !executedVersions.has(migration.version)
    );
  }

  /**
   * Gets all available migration files from the migrations directory
   * @returns Array of migration file information
   */
  private getAvailableMigrations(): MigrationInfo[] {
    const migrations: MigrationInfo[] = [
      {
        version: '001',
        filename: '001_create_users_table.sql',
        path: join(__dirname, '001_create_users_table.sql')
      },
      {
        version: '002', 
        filename: '002_create_todos_table.sql',
        path: join(__dirname, '002_create_todos_table.sql')
      }
    ];
    
    return migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Executes a single migration file
   * @param migration Migration file information
   */
  private async runMigration(migration: MigrationInfo): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Read and execute migration SQL
      const sql = readFileSync(migration.path, 'utf8');
      await client.query(sql);
      
      // Record migration as executed
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [migration.version]
      );
      
      await client.query('COMMIT');
      console.log(`Migration ${migration.version} completed successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Migration ${migration.version} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * Migration file information structure
 */
interface MigrationInfo {
  version: string;
  filename: string;
  path: string;
}