import { Pool, Client } from 'pg';
import { DatabaseError } from '../errors/database-error';

const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'todo_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password'
};

const DUPLICATE_EMAIL_ERROR_CODE = '23505';
const FOREIGN_KEY_VIOLATION_ERROR_CODE = '23503';
const CHECK_CONSTRAINT_VIOLATION_ERROR_CODE = '23514';
const VALID_STATUS_VALUES = ['open', 'in_progress', 'done'];

describe('Database Schema Tests', () => {
  let pool: Pool;
  let client: Client;

  beforeAll(async () => {
    pool = new Pool(TEST_DB_CONFIG);
    client = await pool.connect();
    
    // Clean up test data
    await client.query('DELETE FROM todos');
    await client.query('DELETE FROM users');
  });

  afterAll(async () => {
    client.release();
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up between tests
    await client.query('DELETE FROM todos');
    await client.query('DELETE FROM users');
  });

  describe('AC-001: Email uniqueness constraint violation', () => {
    /**
     * Tests that duplicate email addresses are rejected by the database
     * Verifies the unique constraint on the users.email column
     */
    it('should reject duplicate email addresses', async () => {
      const email = 'test@example.com';
      const password = 'hashedpassword123';

      // Insert first user successfully
      await client.query(
        'INSERT INTO users (email, password) VALUES ($1, $2)',
        [email, password]
      );

      // Attempt to insert duplicate email should fail
      await expect(
        client.query(
          'INSERT INTO users (email, password) VALUES ($1, $2)',
          [email, 'differentpassword']
        )
      ).rejects.toMatchObject({
        code: DUPLICATE_EMAIL_ERROR_CODE
      });
    });

    /**
     * Tests that the unique constraint is case-insensitive
     */
    it('should reject duplicate emails with different cases', async () => {
      await client.query(
        'INSERT INTO users (email, password) VALUES ($1, $2)',
        ['test@example.com', 'password123']
      );

      await expect(
        client.query(
          'INSERT INTO users (email, password) VALUES ($1, $2)',
          ['TEST@EXAMPLE.COM', 'password456']
        )
      ).rejects.toMatchObject({
        code: DUPLICATE_EMAIL_ERROR_CODE
      });
    });
  });

  describe('AC-002: Status field constraint validation', () => {
    let userId: number;

    beforeEach(async () => {
      const userResult = await client.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
        ['test@example.com', 'password123']
      );
      userId = userResult.rows[0].id;
    });

    /**
     * Tests that valid status values are accepted
     */
    it('should accept valid status values', async () => {
      for (const status of VALID_STATUS_VALUES) {
        await expect(
          client.query(
            'INSERT INTO todos (user_id, title, status) VALUES ($1, $2, $3)',
            [userId, `Task with ${status} status`, status]
          )
        ).resolves.not.toThrow();
      }
    });

    /**
     * Tests that invalid status values are rejected
     */
    it('should reject invalid status values', async () => {
      const invalidStatuses = ['invalid', 'completed', 'pending', '', null];

      for (const invalidStatus of invalidStatuses) {
        await expect(
          client.query(
            'INSERT INTO todos (user_id, title, status) VALUES ($1, $2, $3)',
            [userId, 'Test task', invalidStatus]
          )
        ).rejects.toMatchObject({
          code: CHECK_CONSTRAINT_VIOLATION_ERROR_CODE
        });
      }
    });

    /**
     * Tests that status field has a default value
     */
    it('should use default status when not specified', async () => {
      const result = await client.query(
        'INSERT INTO todos (user_id, title) VALUES ($1, $2) RETURNING status',
        [userId, 'Task without explicit status']
      );

      expect(result.rows[0].status).toBe('open');
    });
  });

  describe('AC-003: Foreign key cascade behavior', () => {
    /**
     * Tests that deleting a user cascades to delete their todos
     */
    it('should cascade delete todos when user is deleted', async () => {
      // Create user and todos
      const userResult = await client.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
        ['user@example.com', 'password123']
      );
      const userId = userResult.rows[0].id;

      await client.query(
        'INSERT INTO todos (user_id, title) VALUES ($1, $2)',
        [userId, 'Todo 1']
      );
      await client.query(
        'INSERT INTO todos (user_id, title) VALUES ($1, $2)',
        [userId, 'Todo 2']
      );

      // Verify todos exist
      const todosBeforeDelete = await client.query(
        'SELECT COUNT(*) FROM todos WHERE user_id = $1',
        [userId]
      );
      expect(parseInt(todosBeforeDelete.rows[0].count)).toBe(2);

      // Delete user
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      // Verify todos are deleted
      const todosAfterDelete = await client.query(
        'SELECT COUNT(*) FROM todos WHERE user_id = $1',
        [userId]
      );
      expect(parseInt(todosAfterDelete.rows[0].count)).toBe(0);
    });

    /**
     * Tests that inserting todo with non-existent user_id fails
     */
    it('should reject todos with non-existent user_id', async () => {
      const nonExistentUserId = 99999;

      await expect(
        client.query(
          'INSERT INTO todos (user_id, title) VALUES ($1, $2)',
          [nonExistentUserId, 'Invalid todo']
        )
      ).rejects.toMatchObject({
        code: FOREIGN_KEY_VIOLATION_ERROR_CODE
      });
    });
  });

  describe('AC-004: Index performance on queries', () => {
    /**
     * Tests that email lookups use index efficiently
     */
    it('should use index for email lookups', async () => {
      // Insert test data
      const emails = Array.from({ length: 100 }, (_, i) => `user${i}@example.com`);
      for (const email of emails) {
        await client.query(
          'INSERT INTO users (email, password) VALUES ($1, $2)',
          [email, 'password123']
        );
      }

      // Test query plan for email lookup
      const explainResult = await client.query(
        'EXPLAIN (FORMAT JSON) SELECT * FROM users WHERE email = $1',
        ['user50@example.com']
      );

      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      const scanNode = plan.Plan;

      // Should use index scan, not sequential scan
      expect(scanNode['Node Type']).toBe('Index Scan');
      expect(scanNode['Index Name']).toContain('email');
    });

    /**
     * Tests that user_id queries on todos use index efficiently
     */
    it('should use index for user_id lookups on todos', async () => {
      // Create user and multiple todos
      const userResult = await client.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
        ['testuser@example.com', 'password123']
      );
      const userId = userResult.rows[0].id;

      // Insert multiple todos
      for (let i = 0; i < 50; i++) {
        await client.query(
          'INSERT INTO todos (user_id, title) VALUES ($1, $2)',
          [userId, `Todo ${i}`]
        );
      }

      // Test query plan for user_id lookup
      const explainResult = await client.query(
        'EXPLAIN (FORMAT JSON) SELECT * FROM todos WHERE user_id = $1',
        [userId]
      );

      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      const scanNode = plan.Plan;

      // Should use index scan for foreign key lookup
      expect(scanNode['Node Type']).toBe('Index Scan');
      expect(scanNode['Index Name']).toContain('user_id');
    });

    /**
     * Tests query performance meets requirements
     */
    it('should execute queries within performance thresholds', async () => {
      // Create test data
      const userResult = await client.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
        ['perftest@example.com', 'password123']
      );
      const userId = userResult.rows[0].id;

      for (let i = 0; i < 1000; i++) {
        await client.query(
          'INSERT INTO todos (user_id, title, description) VALUES ($1, $2, $3)',
          [userId, `Performance Test Todo ${i}`, `Description for todo ${i}`]
        );
      }

      // Measure query performance
      const startTime = Date.now();
      await client.query(
        'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
        [userId]
      );
      const queryTime = Date.now() - startTime;

      // Query should complete within reasonable time (adjust threshold as needed)
      expect(queryTime).toBeLessThan(100); // 100ms threshold
    });
  });
});