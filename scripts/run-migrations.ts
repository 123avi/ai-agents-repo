#!/usr/bin/env ts-node

import { createDatabasePool, closeDatabasePool } from '../src/database/config';
import { DatabaseMigrator } from '../src/database/migrations/migrator';

/**
 * Main migration execution script
 * Runs all pending database migrations
 */
async function main(): Promise<void> {
  const pool = createDatabasePool();
  const migrator = new DatabaseMigrator(pool);
  
  try {
    console.log('Starting database migrations...');
    await migrator.runMigrations();
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    await closeDatabasePool(pool);
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}