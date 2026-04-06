#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

/**
 * Migration execution script for database schema updates
 * Handles migration generation, deployment, and rollback operations
 */
class MigrationRunner {
  constructor() {
    this.prismaPath = path.join(__dirname, '..', 'node_modules', '.bin', 'prisma');
  }

  /**
   * Execute a command and handle errors
   * @param {string} command - Command to execute
   * @param {string} description - Description for logging
   */
  executeCommand(command, description) {
    try {
      console.log(`\n🔄 ${description}...`);
      const output = execSync(command, { 
        stdio: 'inherit', 
        cwd: path.join(__dirname, '..'),
        env: { ...process.env }
      });
      console.log(`✅ ${description} completed successfully`);
      return output;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Generate migration files from Prisma schema
   * @param {string} name - Migration name
   */
  generateMigration(name = 'schema_update') {
    const command = `${this.prismaPath} migrate dev --name ${name} --create-only`;
    this.executeCommand(command, `Generating migration: ${name}`);
  }

  /**
   * Deploy pending migrations to database
   */
  deployMigrations() {
    const command = `${this.prismaPath} migrate deploy`;
    this.executeCommand(command, 'Deploying migrations');
  }

  /**
   * Reset database and apply all migrations
   */
  resetDatabase() {
    const command = `${this.prismaPath} migrate reset --force`;
    this.executeCommand(command, 'Resetting database');
  }

  /**
   * Check migration status
   */
  checkStatus() {
    const command = `${this.prismaPath} migrate status`;
    this.executeCommand(command, 'Checking migration status');
  }

  /**
   * Main execution handler
   */
  async run() {
    const args = process.argv.slice(2);
    const action = args[0] || 'deploy';

    try {
      switch (action) {
        case 'generate':
          const migrationName = args[1] || 'schema_update';
          this.generateMigration(migrationName);
          break;
        case 'deploy':
          this.deployMigrations();
          break;
        case 'reset':
          this.resetDatabase();
          break;
        case 'status':
          this.checkStatus();
          break;
        default:
          console.log('Usage: node scripts/run-migrations.js [generate|deploy|reset|status] [migration-name]');
          console.log('  generate [name] - Generate migration from schema');
          console.log('  deploy          - Apply pending migrations');
          console.log('  reset           - Reset database and reapply all migrations');
          console.log('  status          - Check migration status');
          break;
      }
    } catch (error) {
      console.error('\n💥 Migration operation failed:', error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const runner = new MigrationRunner();
  runner.run();
}

module.exports = MigrationRunner;