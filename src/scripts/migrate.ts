import { Migrator } from '../database/migrator';

/**
 * Standalone migration script
 * Can be run with: npm run migrate
 */
async function runMigrations() {
  try {
    const migrator = new Migrator();
    const count = await migrator.runMigrations();
    
    console.log(`Migration completed. Applied ${count} migrations.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();