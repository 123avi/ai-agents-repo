#!/usr/bin/env node
const { DatabaseMigrator } = require('../src/database/migrator');

const COMMAND_UP = 'up';
const COMMAND_DOWN = 'down';
const VALID_COMMANDS = [COMMAND_UP, COMMAND_DOWN];

/**
 * Main migration script entry point
 * @returns {Promise<void>}
 */
async function main() {
  const command = process.argv[2];
  
  if (!command || !VALID_COMMANDS.includes(command)) {
    console.error('Usage: node migrate.js <up|down>');
    console.error('  up   - Run all migrations');
    console.error('  down - Rollback all migrations');
    process.exit(1);
  }

  const migrator = new DatabaseMigrator();
  
  try {
    if (command === COMMAND_UP) {
      console.log('Running database migrations...');
      await migrator.runMigrations();
      console.log('All migrations completed successfully');
    } else if (command === COMMAND_DOWN) {
      console.log('Rolling back database migrations...');
      await migrator.rollbackMigrations();
      console.log('All rollbacks completed successfully');
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await migrator.close();
  }
}

// Execute if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };