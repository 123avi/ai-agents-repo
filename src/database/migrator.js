const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

/**
 * Database migration manager for creating and rolling back schema changes
 */
class DatabaseMigrator {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'todoapp',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Runs all migration files in the migrations directory
   * @returns {Promise<void>}
   */
  async runMigrations() {
    const migrationsDir = path.join(__dirname, '../../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      await this.executeMigrationFile(path.join(migrationsDir, file));
      console.log(`Migration ${file} completed successfully`);
    }
  }

  /**
   * Rolls back migrations in reverse order
   * @returns {Promise<void>}
   */
  async rollbackMigrations() {
    const rollbackDir = path.join(__dirname, '../../migrations/rollback');
    const rollbackFiles = fs.readdirSync(rollbackDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .reverse();

    for (const file of rollbackFiles) {
      await this.executeMigrationFile(path.join(rollbackDir, file));
      console.log(`Rollback ${file} completed successfully`);
    }
  }

  /**
   * Executes a single migration file
   * @param {string} filePath - Path to migration file
   * @returns {Promise<void>}
   */
  async executeMigrationFile(filePath) {
    const sql = fs.readFileSync(filePath, 'utf8');
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error executing migration ${filePath}:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Closes database connection pool
   * @returns {Promise<void>}
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = { DatabaseMigrator };