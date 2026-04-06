#!/usr/bin/env ts-node

import { MigrationRunner } from '../src/database/migration-runner';
import { DatabaseConnection } from '../src/database/connection';

/**
 * Migration script entry point
 */
async function runMigrations(): Promise<void> {
  const pool = DatabaseConnection.getPool();
  const runner = new MigrationRunner(pool);

  try {
    console.log('Starting database migrations...');
    await runner.runMigrations();
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await DatabaseConnection.close();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}