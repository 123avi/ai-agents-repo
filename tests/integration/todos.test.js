const request = require('supertest');
const app = require('../../src/app');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/todo_test';
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';
const BCRYPT_ROUNDS = 10;

// Database connection pool for tests
const pool = new Pool({ connectionString: TEST_DATABASE_URL });

describe('Todo Retrieval Integration Tests', () => {
  let testUsers = [];
  let testTodos = [];

  beforeAll(async () => {
    // Clean database and setup test data
    await setupTestDatabase();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestDatabase();
    await pool.end();
  });

  beforeEach(async () => {
    // Reset test data before each test
    await resetTestData();
  });

  describe('AC-001: Test retrieval returns user\'s todos with 200 status', () => {
    test('should return user\'s todos with 200 status', async () => {
      const userToken = generateValidToken(testUsers[0].id);
      
      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      
      // Verify todos belong to the user
      response.body.data.forEach(todo => {
        expect(todo.user_id).toBe(testUsers[0].id);
        expect(todo).toHaveProperty('id');
        expect(todo).toHaveProperty('title');
        expect(todo).toHaveProperty('description');
        expect(todo).toHaveProperty('status');
        expect(todo).toHaveProperty('created_at');
        expect(todo).toHaveProperty('updated_at');
      });
    });
  });

  describe('AC-002: Test data isolation - user cannot see other user\'s todos', () => {
    test('should only return current user\'s todos, not other users\' todos', async () => {
      const user1Token = generateValidToken(testUsers[0].id);
      const user2Token = generateValidToken(testUsers[1].id);

      // Get todos for user 1
      const user1Response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${user1Token}`);

      // Get todos for user 2
      const user2Response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user1Response.status).toBe(200);
      expect(user2Response.status).toBe(200);

      // Verify user 1 only sees their todos
      expect(user1Response.body.data).toHaveLength(2);
      user1Response.body.data.forEach(todo => {
        expect(todo.user_id).toBe(testUsers[0].id);
      });

      // Verify user 2 only sees their todos
      expect(user2Response.body.data).toHaveLength(1);
      user2Response.body.data.forEach(todo => {
        expect(todo.user_id).toBe(testUsers[1].id);
      });

      // Verify no overlap in todo IDs
      const user1TodoIds = user1Response.body.data.map(todo => todo.id);
      const user2TodoIds = user2Response.body.data.map(todo => todo.id);
      const intersection = user1TodoIds.filter(id => user2TodoIds.includes(id));
      expect(intersection).toHaveLength(0);
    });
  });

  describe('AC-003: Test empty list returns 200 with empty array', () => {
    test('should return 200 with empty array for user with no todos', async () => {
      const emptyUserToken = generateValidToken(testUsers[2].id);
      
      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${emptyUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('AC-004: Test missing auth token returns 401 status', () => {
    test('should return 401 when no authorization header is provided', async () => {
      const response = await request(app)
        .get('/api/todos');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('token');
    });

    test('should return 401 when authorization header is malformed', async () => {
      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('AC-005: Test invalid auth token returns 401 status', () => {
    test('should return 401 for expired token', async () => {
      const expiredToken = generateExpiredToken(testUsers[0].id);
      
      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('expired');
    });

    test('should return 401 for malformed token', async () => {
      const malformedToken = 'invalid.jwt.token';
      
      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${malformedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    test('should return 401 for token with non-existent user', async () => {
      const nonExistentUserId = 99999;
      const invalidUserToken = generateValidToken(nonExistentUserId);
      
      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${invalidUserToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  /**
   * Sets up test database with tables and initial data
   */
  async function setupTestDatabase() {
    try {
      // Create tables if they don't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create test users
      const hashedPassword = await bcrypt.hash('testpassword123', BCRYPT_ROUNDS);
      
      const userResult1 = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
        ['user1@test.com', hashedPassword]
      );
      
      const userResult2 = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
        ['user2@test.com', hashedPassword]
      );
      
      const userResult3 = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
        ['user3@test.com', hashedPassword]
      );

      testUsers = [userResult1.rows[0], userResult2.rows[0], userResult3.rows[0]];

      // Create test todos
      const todoResult1 = await pool.query(
        'INSERT INTO todos (title, description, status, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
        ['User 1 Todo 1', 'First todo for user 1', 'pending', testUsers[0].id]
      );
      
      const todoResult2 = await pool.query(
        'INSERT INTO todos (title, description, status, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
        ['User 1 Todo 2', 'Second todo for user 1', 'completed', testUsers[0].id]
      );
      
      const todoResult3 = await pool.query(
        'INSERT INTO todos (title, description, status, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
        ['User 2 Todo 1', 'First todo for user 2', 'pending', testUsers[1].id]
      );

      testTodos = [todoResult1.rows[0], todoResult2.rows[0], todoResult3.rows[0]];
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  }

  /**
   * Resets test data to initial state
   */
  async function resetTestData() {
    try {
      await pool.query('DELETE FROM todos');
      await pool.query('DELETE FROM users');
      
      // Recreate test data
      const hashedPassword = await bcrypt.hash('testpassword123', BCRYPT_ROUNDS);
      
      for (let i = 0; i < testUsers.length; i++) {
        const userResult = await pool.query(
          'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
          [testUsers[i].email, hashedPassword]
        );
        testUsers[i] = userResult.rows[0];
      }

      // Recreate todos for users 1 and 2, leave user 3 empty
      await pool.query(
        'INSERT INTO todos (title, description, status, user_id) VALUES ($1, $2, $3, $4)',
        ['User 1 Todo 1', 'First todo for user 1', 'pending', testUsers[0].id]
      );
      
      await pool.query(
        'INSERT INTO todos (title, description, status, user_id) VALUES ($1, $2, $3, $4)',
        ['User 1 Todo 2', 'Second todo for user 1', 'completed', testUsers[0].id]
      );
      
      await pool.query(
        'INSERT INTO todos (title, description, status, user_id) VALUES ($1, $2, $3, $4)',
        ['User 2 Todo 1', 'First todo for user 2', 'pending', testUsers[1].id]
      );
    } catch (error) {
      console.error('Failed to reset test data:', error);
      throw error;
    }
  }

  /**
   * Cleans up test database
   */
  async function cleanupTestDatabase() {
    try {
      await pool.query('DROP TABLE IF EXISTS todos');
      await pool.query('DROP TABLE IF EXISTS users');
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
    }
  }

  /**
   * Generates a valid JWT token for testing
   * @param {number} userId - User ID to include in token
   * @returns {string} Valid JWT token
   */
  function generateValidToken(userId) {
    return jwt.sign(
      { userId: userId },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  /**
   * Generates an expired JWT token for testing
   * @param {number} userId - User ID to include in token
   * @returns {string} Expired JWT token
   */
  function generateExpiredToken(userId) {
    return jwt.sign(
      { userId: userId },
      JWT_SECRET,
      { expiresIn: '-1h' }
    );
  }
});