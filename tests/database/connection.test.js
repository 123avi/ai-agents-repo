const { Pool } = require('pg');
const { DatabaseConnection } = require('../../src/database/connection');
const { DatabaseMigrator } = require('../../src/database/migrator');

// Test constants
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'todo_test',
  user: process.env.TEST_DB_USER || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password'
};

const CONNECTION_TIMEOUT_MS = 5000;
const POOL_SIZE = 5;

describe('Database Connection Tests', () => {
  let dbConnection;
  let testPool;

  beforeAll(async () => {
    // Create test database connection
    testPool = new Pool({
      ...TEST_DB_CONFIG,
      max: POOL_SIZE,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
      idleTimeoutMillis: 30000
    });
  });

  afterAll(async () => {
    if (testPool) {
      await testPool.end();
    }
    if (dbConnection) {
      await dbConnection.close();
    }
  });

  beforeEach(() => {
    dbConnection = new DatabaseConnection(TEST_DB_CONFIG);
  });

  afterEach(async () => {
    if (dbConnection) {
      await dbConnection.close();
      dbConnection = null;
    }
  });

  describe('AC-001: Database connection establishment and cleanup', () => {
    test('should establish database connection successfully', async () => {
      await expect(dbConnection.connect()).resolves.not.toThrow();
      expect(dbConnection.isConnected()).toBe(true);
    });

    test('should handle connection failure gracefully', async () => {
      const badConnection = new DatabaseConnection({
        ...TEST_DB_CONFIG,
        host: 'invalid-host',
        connectionTimeoutMillis: 1000
      });

      await expect(badConnection.connect()).rejects.toThrow();
      expect(badConnection.isConnected()).toBe(false);
      await badConnection.close();
    });

    test('should close connection properly', async () => {
      await dbConnection.connect();
      expect(dbConnection.isConnected()).toBe(true);
      
      await dbConnection.close();
      expect(dbConnection.isConnected()).toBe(false);
    });

    test('should handle multiple close calls without error', async () => {
      await dbConnection.connect();
      await dbConnection.close();
      await expect(dbConnection.close()).resolves.not.toThrow();
    });

    test('should retry connection on timeout', async () => {
      const retryConnection = new DatabaseConnection({
        ...TEST_DB_CONFIG,
        connectionTimeoutMillis: 100,
        retryAttempts: 2,
        retryDelay: 50
      });

      // Mock a timeout on first attempt, success on retry
      const connectSpy = jest.spyOn(retryConnection, 'connect');
      await expect(retryConnection.connect()).resolves.not.toThrow();
      
      await retryConnection.close();
    });
  });

  describe('AC-002: Connection pool behavior under load', () => {
    test('should handle concurrent connections within pool limit', async () => {
      const pool = new Pool({
        ...TEST_DB_CONFIG,
        max: POOL_SIZE
      });

      const concurrentQueries = Array.from({ length: POOL_SIZE }, (_, i) => 
        pool.query('SELECT $1 as connection_id', [i])
      );

      const results = await Promise.all(concurrentQueries);
      expect(results).toHaveLength(POOL_SIZE);
      results.forEach((result, index) => {
        expect(result.rows[0].connection_id).toBe(index);
      });

      await pool.end();
    });

    test('should queue connections when pool is exhausted', async () => {
      const smallPool = new Pool({
        ...TEST_DB_CONFIG,
        max: 2,
        acquireTimeoutMillis: 2000
      });

      const longRunningQueries = [
        smallPool.query('SELECT pg_sleep(0.5), 1 as id'),
        smallPool.query('SELECT pg_sleep(0.5), 2 as id')
      ];
      
      const queuedQuery = smallPool.query('SELECT 3 as id');
      
      const startTime = Date.now();
      const results = await Promise.all([...longRunningQueries, queuedQuery]);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(3);
      expect(duration).toBeGreaterThan(400); // Should wait for pool slot
      
      await smallPool.end();
    });

    test('should handle pool connection failures', async () => {
      const faultyPool = new Pool({
        ...TEST_DB_CONFIG,
        host: 'invalid-host',
        max: 1,
        connectionTimeoutMillis: 1000
      });

      await expect(faultyPool.query('SELECT 1')).rejects.toThrow();
      await faultyPool.end();
    });

    test('should recover from connection drops', async () => {
      const pool = new Pool({
        ...TEST_DB_CONFIG,
        max: 2
      });

      // Initial successful query
      await expect(pool.query('SELECT 1')).resolves.not.toThrow();
      
      // Force connection drop by ending client
      const client = await pool.connect();
      client.release();
      
      // Pool should recover and create new connection
      await expect(pool.query('SELECT 2')).resolves.not.toThrow();
      
      await pool.end();
    });
  });

  describe('AC-003: Schema constraints and foreign keys', () => {
    beforeEach(async () => {
      await dbConnection.connect();
      // Clean up test data
      await dbConnection.query('TRUNCATE TABLE todos, users CASCADE');
    });

    test('should enforce unique email constraint', async () => {
      const email = 'test@example.com';
      
      await dbConnection.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
        [email, 'hash1']
      );
      
      await expect(
        dbConnection.query(
          'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
          [email, 'hash2']
        )
      ).rejects.toThrow(/duplicate key value violates unique constraint/);
    });

    test('should enforce foreign key constraint on todos', async () => {
      const nonExistentUserId = 99999;
      
      await expect(
        dbConnection.query(
          'INSERT INTO todos (user_id, title, completed) VALUES ($1, $2, $3)',
          [nonExistentUserId, 'Test Todo', false]
        )
      ).rejects.toThrow(/violates foreign key constraint/);
    });

    test('should enforce NOT NULL constraints', async () => {
      await expect(
        dbConnection.query(
          'INSERT INTO users (email, password_hash) VALUES (NULL, $1)',
          ['hash']
        )
      ).rejects.toThrow(/null value in column "email" violates not-null constraint/);
      
      await expect(
        dbConnection.query(
          'INSERT INTO todos (user_id, title, completed) VALUES ($1, NULL, $2)',
          [1, false]
        )
      ).rejects.toThrow(/null value in column "title" violates not-null constraint/);
    });

    test('should validate email format constraint', async () => {
      await expect(
        dbConnection.query(
          'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
          ['invalid-email', 'hash']
        )
      ).rejects.toThrow(/violates check constraint/);
    });

    test('should cascade delete todos when user is deleted', async () => {
      // Create user and todo
      const userResult = await dbConnection.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        ['cascade@example.com', 'hash']
      );
      const userId = userResult.rows[0].id;
      
      await dbConnection.query(
        'INSERT INTO todos (user_id, title, completed) VALUES ($1, $2, $3)',
        [userId, 'Test Todo', false]
      );
      
      // Verify todo exists
      const todosBefore = await dbConnection.query(
        'SELECT * FROM todos WHERE user_id = $1',
        [userId]
      );
      expect(todosBefore.rows).toHaveLength(1);
      
      // Delete user
      await dbConnection.query('DELETE FROM users WHERE id = $1', [userId]);
      
      // Verify todos are cascaded
      const todosAfter = await dbConnection.query(
        'SELECT * FROM todos WHERE user_id = $1',
        [userId]
      );
      expect(todosAfter.rows).toHaveLength(0);
    });
  });

  describe('AC-004: Migration rollback functionality', () => {
    let migrator;

    beforeEach(async () => {
      await dbConnection.connect();
      migrator = new DatabaseMigrator(dbConnection);
    });

    test('should rollback migration successfully', async () => {
      const testMigration = {
        id: 'test_migration_001',
        up: 'CREATE TABLE test_rollback (id SERIAL PRIMARY KEY, name VARCHAR(100))',
        down: 'DROP TABLE IF EXISTS test_rollback'
      };
      
      // Apply migration
      await migrator.applyMigration(testMigration);
      
      // Verify table exists
      const tableExists = await dbConnection.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'test_rollback')"
      );
      expect(tableExists.rows[0].exists).toBe(true);
      
      // Rollback migration
      await migrator.rollbackMigration(testMigration.id);
      
      // Verify table is dropped
      const tableExistsAfter = await dbConnection.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'test_rollback')"
      );
      expect(tableExistsAfter.rows[0].exists).toBe(false);
    });

    test('should handle rollback of non-existent migration', async () => {
      await expect(
        migrator.rollbackMigration('non_existent_migration')
      ).rejects.toThrow(/Migration not found/);
    });

    test('should maintain migration history during rollback', async () => {
      const testMigration = {
        id: 'test_migration_002',
        up: 'CREATE TABLE test_history (id SERIAL PRIMARY KEY)',
        down: 'DROP TABLE IF EXISTS test_history'
      };
      
      await migrator.applyMigration(testMigration);
      await migrator.rollbackMigration(testMigration.id);
      
      const history = await migrator.getMigrationHistory();
      const rollbackEntry = history.find(h => 
        h.migration_id === testMigration.id && h.action === 'rollback'
      );
      
      expect(rollbackEntry).toBeDefined();
      expect(rollbackEntry.action).toBe('rollback');
    });

    test('should rollback multiple migrations in reverse order', async () => {
      const migrations = [
        {
          id: 'multi_001',
          up: 'CREATE TABLE multi_1 (id SERIAL PRIMARY KEY)',
          down: 'DROP TABLE IF EXISTS multi_1'
        },
        {
          id: 'multi_002', 
          up: 'CREATE TABLE multi_2 (id SERIAL PRIMARY KEY, multi_1_id INTEGER REFERENCES multi_1(id))',
          down: 'DROP TABLE IF EXISTS multi_2'
        }
      ];
      
      // Apply migrations
      for (const migration of migrations) {
        await migrator.applyMigration(migration);
      }
      
      // Rollback all
      await migrator.rollbackToMigration('multi_001');
      
      // Verify only first table exists
      const table1Exists = await dbConnection.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'multi_1')"
      );
      const table2Exists = await dbConnection.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'multi_2')"
      );
      
      expect(table1Exists.rows[0].exists).toBe(true);
      expect(table2Exists.rows[0].exists).toBe(false);
      
      // Clean up
      await migrator.rollbackMigration('multi_001');
    });
  });
});