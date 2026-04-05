const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const SALT_ROUNDS = 10;

describe('PUT /api/todos/:id - Todo Update Integration Tests', () => {
  let user1Token, user2Token;
  let user1Id, user2Id;
  let todo1Id, todo2Id;

  beforeAll(async () => {
    // Create test users
    const hashedPassword = await bcrypt.hash('testpassword123', SALT_ROUNDS);
    
    const user1Result = await db.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
      ['user1@test.com', hashedPassword]
    );
    user1Id = user1Result.rows[0].id;
    user1Token = jwt.sign({ userId: user1Id }, JWT_SECRET, { expiresIn: '24h' });

    const user2Result = await db.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
      ['user2@test.com', hashedPassword]
    );
    user2Id = user2Result.rows[0].id;
    user2Token = jwt.sign({ userId: user2Id }, JWT_SECRET, { expiresIn: '24h' });

    // Create test todos
    const todo1Result = await db.query(
      'INSERT INTO todos (title, description, status, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
      ['User 1 Todo', 'Test todo for user 1', 'pending', user1Id]
    );
    todo1Id = todo1Result.rows[0].id;

    const todo2Result = await db.query(
      'INSERT INTO todos (title, description, status, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
      ['User 2 Todo', 'Test todo for user 2', 'completed', user2Id]
    );
    todo2Id = todo2Result.rows[0].id;
  });

  afterAll(async () => {
    await db.query('DELETE FROM todos WHERE id IN ($1, $2)', [todo1Id, todo2Id]);
    await db.query('DELETE FROM users WHERE id IN ($1, $2)', [user1Id, user2Id]);
    await db.end();
  });

  describe('AC-001: Test successful update returns 200 with updated data', () => {
    it('should update todo successfully and return updated data', async () => {
      const updateData = {
        title: 'Updated Todo Title',
        description: 'Updated description',
        status: 'completed'
      };

      const response = await request(app)
        .put(`/api/todos/${todo1Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(todo1Id);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.user_id).toBe(user1Id);
      expect(response.body.data.updated_at).toBeDefined();
    });

    it('should update partial fields successfully', async () => {
      const updateData = { status: 'in-progress' };

      const response = await request(app)
        .put(`/api/todos/${todo1Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in-progress');
      expect(response.body.data.title).toBe('Updated Todo Title'); // From previous test
    });
  });

  describe('AC-002: Test ownership validation returns 403 for other user\'s todo', () => {
    it('should return 403 when user tries to update another user\'s todo', async () => {
      const updateData = {
        title: 'Attempting to update other user todo',
        status: 'completed'
      };

      const response = await request(app)
        .put(`/api/todos/${todo2Id}`) // User 1 trying to update User 2's todo
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toContain('access');
    });
  });

  describe('AC-003: Test non-existent todo returns 404 status', () => {
    it('should return 404 when todo does not exist', async () => {
      const nonExistentTodoId = 999999;
      const updateData = { title: 'Non-existent todo' };

      const response = await request(app)
        .put(`/api/todos/${nonExistentTodoId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Todo not found');
    });
  });

  describe('AC-004: Test invalid status value returns 400 status', () => {
    it('should return 400 for invalid status value', async () => {
      const updateData = {
        title: 'Valid title',
        status: 'invalid-status'
      };

      const response = await request(app)
        .put(`/api/todos/${todo1Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('status');
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['pending', 'in-progress', 'completed'];
      
      for (const status of validStatuses) {
        const updateData = { status };

        const response = await request(app)
          .put(`/api/todos/${todo1Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.status).toBe(status);
      }
    });
  });

  describe('AC-005: Test missing auth token returns 401 status', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const updateData = { title: 'Unauthorized update attempt' };

      const response = await request(app)
        .put(`/api/todos/${todo1Id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('token');
    });

    it('should return 401 when invalid token is provided', async () => {
      const updateData = { title: 'Invalid token update attempt' };

      const response = await request(app)
        .put(`/api/todos/${todo1Id}`)
        .set('Authorization', 'Bearer invalid-token')
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when malformed authorization header is provided', async () => {
      const updateData = { title: 'Malformed auth update attempt' };

      const response = await request(app)
        .put(`/api/todos/${todo1Id}`)
        .set('Authorization', 'InvalidFormat token')
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});