import { DatabaseConnection } from '../../src/database/connection';
import { DatabaseMigrator, Migration } from '../../src/database/migrator';
import { Pool } from 'pg';
import { logger } from '../../src/utils/logger';

const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'todo_api_test',
  user: process.env.TEST_DB_USER || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password'
};

const ADMIN_DB_CONFIG = {
  ...TEST_DB_CONFIG,
  database: 'postgres'
};

describe('Database Connection Tests', () => {
  let connection: DatabaseConnection;
  let migrator: DatabaseMigrator;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    connection = new DatabaseConnection(TEST_DB_CONFIG);
    await connection.connect();
    migrator = new DatabaseMigrator(connection);
    await migrator.initializeMigrationsTable();
  });

  afterEach(async () => {
    if (connection) {
      await connection.close();
    }
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('AC-001: Test database connection establishment and cleanup', () => {
    it('should establish connection successfully', async () => {
      const testConnection = new DatabaseConnection(TEST_DB_CONFIG);
      await expect(testConnection.connect()).resolves.not.toThrow();
      await testConnection.close();
    });

    it('should handle connection errors gracefully', async () => {
      const badConfig = { ...TEST_DB_CONFIG, port: 9999 };
      const testConnection = new DatabaseConnection(badConfig);
      await expect(testConnection.connect()).rejects.toThrow();
    });

    it('should close connections properly', async () => {
      const testConnection = new DatabaseConnection(TEST_DB_CONFIG);
      await testConnection.connect();
      await expect(testConnection.close()).resolves.not.toThrow();
    });

    it('should retry connection on timeout', async () => {
      const testConnection = new DatabaseConnection(TEST_DB_CONFIG);
      const connectSpy = jest.spyOn(testConnection as any, 'pool');
      
      // Mock the pool to simulate timeout then success
      const mockPool = {
        connect: jest.fn()
          .mockRejectedValueOnce(new Error('timeout'))
          .mockRejectedValueOnce(new Error('timeout'))
          .mockResolvedValueOnce({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            release: jest.fn()
          }),
        on: jest.fn(),
        end: jest.fn()
      };
      
      Object.defineProperty(testConnection, 'pool', {
        value: mockPool,
        writable: true
      });

      await testConnection.connect();
      expect(mockPool.connect).toHaveBeenCalledTimes(3);
      await testConnection.close();
    });
  });

  describe('AC-002: Test connection pool behavior under load', () => {
    it('should handle concurrent connections', async () => {
      const promises = Array.from({ length: 20 }, () => 
        connection.query('SELECT $1 as test_value', ['concurrent_test'])
      );
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result.rows[0].test_value).toBe('concurrent_test');
      });
    });

    it('should maintain pool health under load', async () => {
      const healthChecks = Array.from({ length: 10 }, () => connection.healthCheck());
      const results = await Promise.all(healthChecks);
      expect(results.every(result => result === true)).toBe(true);
    });

    it('should recover from pool exhaustion', async () => {
      // Create many concurrent long-running queries
      const longQueries = Array.from({ length: 15 }, () => 
        connection.query('SELECT pg_sleep(0.1)')
      );
      
      await Promise.all(longQueries);
      
      // Pool should still be healthy after exhaustion recovery
      const isHealthy = await connection.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });

  describe('AC-003: Verify schema constraints and foreign keys', () => {
    beforeEach(async () => {
      await createTestSchema();
    });

    it('should enforce unique email constraint', async () => {
      await connection.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
        ['test@example.com', 'hash1']
      );

      await expect(
        connection.query(
          'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
          ['test@example.com', 'hash2']
        )
      ).rejects.toThrow(/duplicate key value violates unique constraint/);
    });

    it('should enforce foreign key constraints', async () => {
      await expect(
        connection.query(
          'INSERT INTO todos (user_id, title, completed) VALUES ($1, $2, $3)',
          [99999, 'Test Todo', false]
        )
      ).rejects.toThrow(/violates foreign key constraint/);
    });

    it('should enforce not null constraints', async () => {
      await expect(
        connection.query(
          'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
          [null, 'hash']
        )
      ).rejects.toThrow(/null value in column "email"/);
    });
  });

  describe('AC-004: Test migration rollback functionality', () => {
    const testMigration: Migration = {
      id: '001_test_migration',
      up: 'CREATE TABLE test_migration_table (id SERIAL PRIMARY KEY, name VARCHAR(100));',
      down: 'DROP TABLE IF EXISTS test_migration_table;'
    };

    it('should run migration successfully', async () => {
      await migrator.runMigration(testMigration);
      
      const appliedMigrations = await migrator.getAppliedMigrations();
      expect(appliedMigrations).toContain('001_test_migration');
      
      // Verify table exists
      const tableExists = await connection.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables 
         WHERE table_name = 'test_migration_table')`
      );
      expect(tableExists.rows[0].exists).toBe(true);
    });

    it('should rollback migration successfully', async () => {
      await migrator.runMigration(testMigration);
      await migrator.rollbackMigration(testMigration);
      
      const appliedMigrations = await migrator.getAppliedMigrations();
      expect(appliedMigrations).not.toContain('001_test_migration');
      
      // Verify table doesn't exist
      const tableExists = await connection.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables 
         WHERE table_name = 'test_migration_table')`
      );
      expect(tableExists.rows[0].exists).toBe(false);
    });

    it('should handle rollback failures gracefully', async () => {
      const badRollbackMigration: Migration = {
        id: '002_bad_rollback',
        up: 'CREATE TABLE bad_rollback_table (id SERIAL);',
        down: 'DROP TABLE nonexistent_table;' // This will fail
      };

      await migrator.runMigration(badRollbackMigration);
      
      await expect(migrator.rollbackMigration(badRollbackMigration))
        .rejects.toThrow(/Rollback failed/);
      
      // Migration should still be recorded as applied since rollback failed
      const appliedMigrations = await migrator.getAppliedMigrations();
      expect(appliedMigrations).toContain('002_bad_rollback');
    });

    it('should handle migration failures with proper cleanup', async () => {
      const failingMigration: Migration = {
        id: '003_failing_migration',
        up: 'CREATE TABLE invalid_syntax INVALID SQL;',
        down: 'DROP TABLE invalid_syntax;'
      };

      await expect(migrator.runMigration(failingMigration))
        .rejects.toThrow();
      
      // Failed migration should not be recorded
      const appliedMigrations = await migrator.getAppliedMigrations();
      expect(appliedMigrations).not.toContain('003_failing_migration');
    });
  });
});

/**
 * Sets up the test database by creating it if it doesn't exist
 */
async function setupTestDatabase(): Promise<void> {
  await createDatabaseIfNotExists();
  await createConnectionAndSchema();
}

/**
 * Creates the test database if it doesn't already exist
 */
async function createDatabaseIfNotExists(): Promise<void> {
  const adminConnection = new DatabaseConnection(ADMIN_DB_CONFIG);
  try {
    await adminConnection.connect();
    
    const dbExistsResult = await adminConnection.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [TEST_DB_CONFIG.database]
    );
    
    if (dbExistsResult.rows.length === 0) {
      await adminConnection.query(
        `CREATE DATABASE "${TEST_DB_CONFIG.database}"`
      );
      logger.info(`Test database ${TEST_DB_CONFIG.database} created`);
    }
  } catch (error) {
    logger.error('Failed to create test database:', error);
    throw error;
  } finally {
    await adminConnection.close();
  }
}

/**
 * Creates connection and basic schema for tests
 */
async function createConnectionAndSchema(): Promise<void> {
  const connection = new DatabaseConnection(TEST_DB_CONFIG);
  try {
    await connection.connect();
    await createTestSchema(connection);
  } catch (error) {
    logger.error('Failed to setup test schema:', error);
    throw error;
  } finally {
    await connection.close();
  }
}

/**
 * Creates the test schema with users and todos tables
 */
async function createTestSchema(conn?: DatabaseConnection): Promise<void> {
  const dbConnection = conn || connection;
  
  await dbConnection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbConnection.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Cleans up the test database
 */
async function cleanupTestDatabase(): Promise<void> {
  const adminConnection = new DatabaseConnection(ADMIN_DB_CONFIG);
  try {
    await adminConnection.connect();
    await adminConnection.query(
      `DROP DATABASE IF EXISTS "${TEST_DB_CONFIG.database}"`
    );
    logger.info(`Test database ${TEST_DB_CONFIG.database} cleaned up`);
  } catch (error) {
    logger.error('Failed to cleanup test database:', error);
  } finally {
    await adminConnection.close();
  }
}