const request = require('supertest');
const app = require('../../src/app');
const { setupTestDatabase, cleanupTestDatabase, createTestUser, generateTestToken } = require('../helpers/test-utils');

/**
 * Integration tests for todo CRUD endpoints
 * Tests all todo management endpoints with authentication and authorization
 */
describe('Todo CRUD Endpoints', () => {
  let testUser1, testUser2;
  let token1, token2;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Create two test users for isolation testing
    testUser1 = await createTestUser('user1@test.com', 'password123');
    testUser2 = await createTestUser('user2@test.com', 'password456');
    
    token1 = generateTestToken(testUser1.id);
    token2 = generateTestToken(testUser2.id);
  });

  describe('POST /api/todos - Create Todo', () => {
    /**
     * AC-001: Test create todo with valid and invalid data
     */
    it('should create todo with valid data', async () => {
      const todoData = {
        title: 'Test Todo',
        description: 'Test Description',
        completed: false
      };

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${token1}`)
        .send(todoData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(todoData.title);
      expect(response.body.description).toBe(todoData.description);
      expect(response.body.completed).toBe(false);
      expect(response.body.user_id).toBe(testUser1.id);
    });

    it('should reject todo creation with missing title', async () => {
      const invalidData = {
        description: 'Test Description'
      };

      await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${token1}`)
        .send(invalidData)
        .expect(400);
    });

    it('should reject todo creation with empty title', async () => {
      const invalidData = {
        title: '',
        description: 'Test Description'
      };

      await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${token1}`)
        .send(invalidData)
        .expect(400);
    });

    it('should reject todo creation with title too long', async () => {
      const invalidData = {
        title: 'a'.repeat(256), // Assuming 255 char limit
        description: 'Test Description'
      };

      await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${token1}`)
        .send(invalidData)
        .expect(400);
    });

    /**
     * AC-005: Test authentication requirements
     */
    it('should require authentication for todo creation', async () => {
      const todoData = {
        title: 'Test Todo',
        description: 'Test Description'
      };

      await request(app)
        .post('/api/todos')
        .send(todoData)
        .expect(401);
    });

    it('should reject invalid JWT token', async () => {
      const todoData = {
        title: 'Test Todo',
        description: 'Test Description'
      };

      await request(app)
        .post('/api/todos')
        .set('Authorization', 'Bearer invalid-token')
        .send(todoData)
        .expect(401);
    });
  });

  describe('GET /api/todos - Retrieve Todos', () => {
    let todo1, todo2, todo3;

    beforeEach(async () => {
      // Create todos for user1
      todo1 = await createTestTodo(testUser1.id, 'User 1 Todo 1');
      todo2 = await createTestTodo(testUser1.id, 'User 1 Todo 2');
      // Create todo for user2
      todo3 = await createTestTodo(testUser2.id, 'User 2 Todo 1');
    });

    /**
     * AC-002: Test retrieve todos returns only user's items
     */
    it('should return only authenticated user\'s todos', async () => {
      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every(todo => todo.user_id === testUser1.id)).toBe(true);
      
      const todoTitles = response.body.map(todo => todo.title);
      expect(todoTitles).toContain('User 1 Todo 1');
      expect(todoTitles).toContain('User 1 Todo 2');
      expect(todoTitles).not.toContain('User 2 Todo 1');
    });

    it('should return empty array when user has no todos', async () => {
      const newUser = await createTestUser('empty@test.com', 'password789');
      const emptyToken = generateTestToken(newUser.id);

      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${emptyToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    /**
     * AC-005: Test authentication requirements
     */
    it('should require authentication for retrieving todos', async () => {
      await request(app)
        .get('/api/todos')
        .expect(401);
    });
  });

  describe('PUT /api/todos/:id - Update Todo', () => {
    let todo1, todo2;

    beforeEach(async () => {
      todo1 = await createTestTodo(testUser1.id, 'Original Title');
      todo2 = await createTestTodo(testUser2.id, 'User 2 Todo');
    });

    /**
     * AC-003: Test update todo with ownership validation
     */
    it('should update user\'s own todo successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        completed: true
      };

      const response = await request(app)
        .put(`/api/todos/${todo1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.completed).toBe(true);
      expect(response.body.user_id).toBe(testUser1.id);
    });

    it('should prevent updating another user\'s todo', async () => {
      const updateData = {
        title: 'Malicious Update',
        completed: true
      };

      await request(app)
        .put(`/api/todos/${todo2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send(updateData)
        .expect(403);
    });

    it('should return 404 for non-existent todo', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      await request(app)
        .put('/api/todos/99999')
        .set('Authorization', `Bearer ${token1}`)
        .send(updateData)
        .expect(404);
    });

    it('should reject update with invalid data', async () => {
      const invalidData = {
        title: '', // Empty title should be rejected
        completed: true
      };

      await request(app)
        .put(`/api/todos/${todo1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send(invalidData)
        .expect(400);
    });

    /**
     * AC-005: Test authentication requirements
     */
    it('should require authentication for updating todo', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      await request(app)
        .put(`/api/todos/${todo1.id}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /api/todos/:id - Delete Todo', () => {
    let todo1, todo2;

    beforeEach(async () => {
      todo1 = await createTestTodo(testUser1.id, 'Todo to Delete');
      todo2 = await createTestTodo(testUser2.id, 'User 2 Todo');
    });

    /**
     * AC-004: Test delete todo with ownership validation
     */
    it('should delete user\'s own todo successfully', async () => {
      await request(app)
        .delete(`/api/todos/${todo1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(204);

      // Verify todo is actually deleted
      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.find(todo => todo.id === todo1.id)).toBeUndefined();
    });

    it('should prevent deleting another user\'s todo', async () => {
      await request(app)
        .delete(`/api/todos/${todo2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403);

      // Verify todo still exists for user2
      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response.body.find(todo => todo.id === todo2.id)).toBeDefined();
    });

    it('should return 404 for non-existent todo', async () => {
      await request(app)
        .delete('/api/todos/99999')
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);
    });

    /**
     * AC-005: Test authentication requirements
     */
    it('should require authentication for deleting todo', async () => {
      await request(app)
        .delete(`/api/todos/${todo1.id}`)
        .expect(401);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle malformed todo ID gracefully', async () => {
      await request(app)
        .get('/api/todos/invalid-id')
        .set('Authorization', `Bearer ${token1}`)
        .expect(400);
    });

    it('should handle expired JWT token', async () => {
      const expiredToken = generateExpiredTestToken(testUser1.id);
      
      await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should handle concurrent todo operations', async () => {
      const todo = await createTestTodo(testUser1.id, 'Concurrent Test');
      
      // Simulate concurrent updates
      const promises = [
        request(app)
          .put(`/api/todos/${todo.id}`)
          .set('Authorization', `Bearer ${token1}`)
          .send({ title: 'Update 1' }),
        request(app)
          .put(`/api/todos/${todo.id}`)
          .set('Authorization', `Bearer ${token1}`)
          .send({ title: 'Update 2' })
      ];

      const results = await Promise.allSettled(promises);
      
      // At least one should succeed
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });
});

/**
 * Helper function to create test todo
 * @param {string} userId - User ID who owns the todo
 * @param {string} title - Todo title
 * @returns {Promise<Object>} Created todo object
 */
async function createTestTodo(userId, title) {
  const db = require('../../src/database/connection');
  const result = await db.query(
    'INSERT INTO todos (user_id, title, description, completed) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, title, 'Test description', false]
  );
  return result.rows[0];
}

/**
 * Helper function to generate expired JWT token for testing
 * @param {string} userId - User ID for the token
 * @returns {string} Expired JWT token
 */
function generateExpiredTestToken(userId) {
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '-1h' } // Expired 1 hour ago
  );
}