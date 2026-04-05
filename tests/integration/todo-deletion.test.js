const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/db/connection');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

/**
 * Integration tests for todo deletion endpoint
 * Tests ownership validation, authentication, and database state changes
 */
describe('DELETE /api/todos/:id - Todo Deletion', () => {
  let user1Token, user2Token;
  let user1Id, user2Id;
  let todoId1, todoId2;

  const TEST_USER_1 = {
    email: 'user1@test.com',
    password: 'password123'
  };

  const TEST_USER_2 = {
    email: 'user2@test.com', 
    password: 'password456'
  };

  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  beforeEach(async () => {
    // Clean up existing test data
    await db.query('DELETE FROM todos WHERE 1=1');
    await db.query('DELETE FROM users WHERE email IN ($1, $2)', [TEST_USER_1.email, TEST_USER_2.email]);

    // Create test users
    const hashedPassword1 = await bcrypt.hash(TEST_USER_1.password, 10);
    const hashedPassword2 = await bcrypt.hash(TEST_USER_2.password, 10);

    const user1Result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [TEST_USER_1.email, hashedPassword1]
    );
    const user2Result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [TEST_USER_2.email, hashedPassword2]
    );

    user1Id = user1Result.rows[0].id;
    user2Id = user2Result.rows[0].id;

    // Generate JWT tokens
    user1Token = jwt.sign({ userId: user1Id, email: TEST_USER_1.email }, JWT_SECRET, { expiresIn: '24h' });
    user2Token = jwt.sign({ userId: user2Id, email: TEST_USER_2.email }, JWT_SECRET, { expiresIn: '24h' });

    // Create test todos
    const todo1Result = await db.query(
      'INSERT INTO todos (title, description, status, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
      ['User 1 Todo', 'Test todo for user 1', 'pending', user1Id]
    );
    const todo2Result = await db.query(
      'INSERT INTO todos (title, description, status, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
      ['User 2 Todo', 'Test todo for user 2', 'pending', user2Id]
    );

    todoId1 = todo1Result.rows[0].id;
    todoId2 = todo2Result.rows[0].id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM todos WHERE 1=1');
    await db.query('DELETE FROM users WHERE email IN ($1, $2)', [TEST_USER_1.email, TEST_USER_2.email]);
  });

  describe('AC-001: Successful deletion returns 204 status', () => {
    it('should return 204 when user deletes their own todo', async () => {
      const response = await request(app)
        .delete(`/api/todos/${todoId1}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });
  });

  describe('AC-002: Ownership validation returns 403 for other user\'s todo', () => {
    it('should return 403 when user tries to delete another user\'s todo', async () => {
      const response = await request(app)
        .delete(`/api/todos/${todoId2}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: expect.stringContaining('access')
        }
      });
    });
  });

  describe('AC-003: Non-existent todo returns 404 status', () => {
    it('should return 404 when todo does not exist', async () => {
      const nonExistentId = 99999;
      
      const response = await request(app)
        .delete(`/api/todos/${nonExistentId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('Todo not found')
        }
      });
    });
  });

  describe('AC-004: Missing auth token returns 401 status', () => {
    it('should return 401 when no auth token provided', async () => {
      const response = await request(app)
        .delete(`/api/todos/${todoId1}`);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('token')
        }
      });
    });

    it('should return 401 when invalid auth token provided', async () => {
      const response = await request(app)
        .delete(`/api/todos/${todoId1}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('token')
        }
      });
    });
  });

  describe('AC-005: Verify todo is removed from database', () => {
    it('should remove todo from database after successful deletion', async () => {
      // Verify todo exists before deletion
      const beforeResult = await db.query('SELECT id FROM todos WHERE id = $1', [todoId1]);
      expect(beforeResult.rows).toHaveLength(1);

      // Delete the todo
      await request(app)
        .delete(`/api/todos/${todoId1}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(204);

      // Verify todo no longer exists
      const afterResult = await db.query('SELECT id FROM todos WHERE id = $1', [todoId1]);
      expect(afterResult.rows).toHaveLength(0);
    });

    it('should not affect other todos when deleting one todo', async () => {
      // Verify both todos exist before deletion
      const beforeResult = await db.query('SELECT id FROM todos WHERE id IN ($1, $2)', [todoId1, todoId2]);
      expect(beforeResult.rows).toHaveLength(2);

      // Delete user1's todo
      await request(app)
        .delete(`/api/todos/${todoId1}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(204);

      // Verify only user1's todo was deleted
      const afterResult = await db.query('SELECT id FROM todos WHERE id IN ($1, $2)', [todoId1, todoId2]);
      expect(afterResult.rows).toHaveLength(1);
      expect(afterResult.rows[0].id).toBe(todoId2);
    });
  });
});