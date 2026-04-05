const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../../src/app');
const db = require('../../src/config/database');

/**
 * Integration tests for todo creation endpoint
 * Tests authentication, validation, and database operations
 */
describe('POST /api/todos - Todo Creation', () => {
  let testUser;
  let validToken;
  let invalidToken;

  /**
   * Setup test data before each test
   */
  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM todos WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
    await db.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);

    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    const userResult = await db.query(
      'INSERT INTO users (email, password_hash, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
      ['testuser@example.com', hashedPassword]
    );
    testUser = userResult.rows[0];

    // Generate valid JWT token
    validToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generate invalid JWT token
    invalidToken = jwt.sign(
      { userId: 999, email: 'invalid@example.com' },
      'invalid-secret',
      { expiresIn: '24h' }
    );
  });

  /**
   * Cleanup after each test
   */
  afterEach(async () => {
    await db.query('DELETE FROM todos WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
    await db.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
  });

  /**
   * Test AC-001: Successful todo creation returns 201 with todo data
   */
  describe('AC-001: Successful todo creation', () => {
    it('should return 201 with todo data for valid request', async () => {
      const todoData = {
        title: 'Test Todo Item',
        description: 'This is a test todo description'
      };

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${validToken}`)
        .send(todoData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(todoData.title);
      expect(response.body.data.description).toBe(todoData.description);
      expect(response.body.data.user_id).toBe(testUser.id);
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');

      // Verify todo was created in database
      const dbResult = await db.query(
        'SELECT * FROM todos WHERE id = $1 AND user_id = $2',
        [response.body.data.id, testUser.id]
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].title).toBe(todoData.title);
    });
  });

  /**
   * Test AC-002: Missing title returns 400 status
   */
  describe('AC-002: Missing title validation', () => {
    it('should return 400 when title is missing', async () => {
      const todoData = {
        description: 'This todo has no title'
      };

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${validToken}`)
        .send(todoData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('title');
    });

    it('should return 400 when title is empty string', async () => {
      const todoData = {
        title: '',
        description: 'This todo has empty title'
      };

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${validToken}`)
        .send(todoData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('title');
    });
  });

  /**
   * Test AC-003: Missing auth token returns 401 status
   */
  describe('AC-003: Missing auth token', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const todoData = {
        title: 'Test Todo',
        description: 'This request has no auth token'
      };

      const response = await request(app)
        .post('/api/todos')
        .send(todoData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('token');
    });

    it('should return 401 when Authorization header is malformed', async () => {
      const todoData = {
        title: 'Test Todo',
        description: 'This request has malformed auth header'
      };

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', 'InvalidFormat')
        .send(todoData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  /**
   * Test AC-004: Invalid auth token returns 401 status
   */
  describe('AC-004: Invalid auth token', () => {
    it('should return 401 for token with invalid signature', async () => {
      const todoData = {
        title: 'Test Todo',
        description: 'This request has invalid token'
      };

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(todoData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('token');
    });

    it('should return 401 for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const todoData = {
        title: 'Test Todo',
        description: 'This request has expired token'
      };

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send(todoData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  /**
   * Test AC-005: Verify todo defaults to 'open' status
   */
  describe('AC-005: Default status verification', () => {
    it('should default todo status to open when not provided', async () => {
      const todoData = {
        title: 'Test Todo Without Status',
        description: 'This todo should default to open status'
      };

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${validToken}`)
        .send(todoData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('open');

      // Verify in database
      const dbResult = await db.query(
        'SELECT status FROM todos WHERE id = $1',
        [response.body.data.id]
      );
      expect(dbResult.rows[0].status).toBe('open');
    });

    it('should preserve explicit status when provided', async () => {
      const todoData = {
        title: 'Test Todo With Status',
        description: 'This todo has explicit status',
        status: 'completed'
      };

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${validToken}`)
        .send(todoData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });
  });

  /**
   * Additional edge case tests
   */
  describe('Edge cases', () => {
    it('should handle long title within limits', async () => {
      const longTitle = 'A'.repeat(200); // Assuming 255 char limit
      const todoData = {
        title: longTitle,
        description: 'Testing long title'
      };

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${validToken}`)
        .send(todoData)
        .expect(201);

      expect(response.body.data.title).toBe(longTitle);
    });

    it('should create todo with only title (no description)', async () => {
      const todoData = {
        title: 'Minimal Todo'
      };

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${validToken}`)
        .send(todoData)
        .expect(201);

      expect(response.body.data.title).toBe('Minimal Todo');
      expect(response.body.data.description).toBe(null);
    });
  });
});