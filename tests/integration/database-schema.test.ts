import { Client } from 'pg';
import { config } from '../../src/config';

/**
 * Database schema integration tests
 * Tests database constraints, foreign keys, and cascade operations
 */
describe('Database Schema Tests', () => {
  let client: Client;
  
  beforeAll(async () => {
    client = new Client({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
    });
    await client.connect();
  });
  
  afterAll(async () => {
    await client.end();
  });
  
  beforeEach(async () => {
    // Clean up test data
    await client.query('DELETE FROM todos WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test-%\')');
    await client.query('DELETE FROM users WHERE email LIKE \'test-%\'');
  });
  
  describe('AC-001: Test unique email constraint violation', () => {
    it('should prevent duplicate email addresses', async () => {
      const email = 'test-unique@example.com';
      const passwordHash = '$2b$12$test.hash';
      
      // Insert first user
      await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
        [email, passwordHash]
      );
      
      // Attempt to insert duplicate email
      await expect(client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
        [email, passwordHash]
      )).rejects.toMatchObject({
        code: '23505', // PostgreSQL unique violation error code
        constraint: 'users_email_key'
      });
    });
    
    it('should allow different email addresses', async () => {
      const passwordHash = '$2b$12$test.hash';
      
      await expect(client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
        ['test-user1@example.com', passwordHash]
      )).resolves.not.toThrow();
      
      await expect(client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
        ['test-user2@example.com', passwordHash]
      )).resolves.not.toThrow();
    });
  });
  
  describe('AC-002: Test foreign key constraint on todos.user_id', () => {
    it('should prevent insertion with invalid user_id', async () => {
      const invalidUserId = 99999;
      
      await expect(client.query(
        'INSERT INTO todos (user_id, title, status) VALUES ($1, $2, $3)',
        [invalidUserId, 'Test Todo', 'open']
      )).rejects.toMatchObject({
        code: '23503', // PostgreSQL foreign key violation error code
        constraint: 'todos_user_id_fkey'
      });
    });
    
    it('should allow insertion with valid user_id', async () => {
      // Create test user
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        ['test-fk@example.com', '$2b$12$test.hash']
      );
      const userId = userResult.rows[0].id;
      
      await expect(client.query(
        'INSERT INTO todos (user_id, title, status) VALUES ($1, $2, $3)',
        [userId, 'Test Todo', 'open']
      )).resolves.not.toThrow();
    });
  });
  
  describe('AC-003: Test status check constraint validation', () => {
    let userId: number;
    
    beforeEach(async () => {
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        ['test-status@example.com', '$2b$12$test.hash']
      );
      userId = userResult.rows[0].id;
    });
    
    it('should allow valid status values', async () => {
      await expect(client.query(
        'INSERT INTO todos (user_id, title, status) VALUES ($1, $2, $3)',
        [userId, 'Open Todo', 'open']
      )).resolves.not.toThrow();
      
      await expect(client.query(
        'INSERT INTO todos (user_id, title, status) VALUES ($1, $2, $3)',
        [userId, 'Done Todo', 'done']
      )).resolves.not.toThrow();
    });
    
    it('should reject invalid status values', async () => {
      await expect(client.query(
        'INSERT INTO todos (user_id, title, status) VALUES ($1, $2, $3)',
        [userId, 'Invalid Todo', 'invalid']
      )).rejects.toMatchObject({
        code: '23514', // PostgreSQL check constraint violation error code
        constraint: 'todos_status_check'
      });
    });
    
    it('should default to open status when not specified', async () => {
      const result = await client.query(
        'INSERT INTO todos (user_id, title) VALUES ($1, $2) RETURNING status',
        [userId, 'Default Status Todo']
      );
      
      expect(result.rows[0].status).toBe('open');
    });
  });
  
  describe('AC-004: Test cascade delete functionality', () => {
    it('should delete todos when user is deleted', async () => {
      // Create test user
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        ['test-cascade@example.com', '$2b$12$test.hash']
      );
      const userId = userResult.rows[0].id;
      
      // Create todos for the user
      await client.query(
        'INSERT INTO todos (user_id, title, status) VALUES ($1, $2, $3)',
        [userId, 'Todo 1', 'open']
      );
      await client.query(
        'INSERT INTO todos (user_id, title, status) VALUES ($1, $2, $3)',
        [userId, 'Todo 2', 'done']
      );
      
      // Verify todos exist
      const todosBeforeDelete = await client.query(
        'SELECT COUNT(*) FROM todos WHERE user_id = $1',
        [userId]
      );
      expect(parseInt(todosBeforeDelete.rows[0].count)).toBe(2);
      
      // Delete the user
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      
      // Verify todos were cascade deleted
      const todosAfterDelete = await client.query(
        'SELECT COUNT(*) FROM todos WHERE user_id = $1',
        [userId]
      );
      expect(parseInt(todosAfterDelete.rows[0].count)).toBe(0);
    });
    
    it('should not affect other users todos when deleting a user', async () => {
      // Create two test users
      const user1Result = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        ['test-cascade1@example.com', '$2b$12$test.hash']
      );
      const user1Id = user1Result.rows[0].id;
      
      const user2Result = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        ['test-cascade2@example.com', '$2b$12$test.hash']
      );
      const user2Id = user2Result.rows[0].id;
      
      // Create todos for both users
      await client.query(
        'INSERT INTO todos (user_id, title, status) VALUES ($1, $2, $3)',
        [user1Id, 'User 1 Todo', 'open']
      );
      await client.query(
        'INSERT INTO todos (user_id, title, status) VALUES ($1, $2, $3)',
        [user2Id, 'User 2 Todo', 'open']
      );
      
      // Delete user 1
      await client.query('DELETE FROM users WHERE id = $1', [user1Id]);
      
      // Verify user 1's todos are deleted but user 2's remain
      const user1TodosAfterDelete = await client.query(
        'SELECT COUNT(*) FROM todos WHERE user_id = $1',
        [user1Id]
      );
      expect(parseInt(user1TodosAfterDelete.rows[0].count)).toBe(0);
      
      const user2TodosAfterDelete = await client.query(
        'SELECT COUNT(*) FROM todos WHERE user_id = $1',
        [user2Id]
      );
      expect(parseInt(user2TodosAfterDelete.rows[0].count)).toBe(1);
    });
  });
});