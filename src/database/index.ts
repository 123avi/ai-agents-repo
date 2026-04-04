export { DatabaseConnection, db } from './connection';
export { Migrator } from './migrator';
export { config as dbConfig, migrationConfig } from '../config/database';

/**
 * Initialize database and run migrations
 * Should be called during application startup
 * @returns Promise that resolves when database is ready
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const migrator = new Migrator();
    const migrationsRun = await migrator.runMigrations();
    
    if (migrationsRun > 0) {
      console.log(`Applied ${migrationsRun} database migrations`);
    } else {
      console.log('Database schema is up to date');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}