import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseConnection } from '../../src/database/connection';
import { User } from '../../src/models/user';
import { Todo } from '../../src/models/todo';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

/**
 * Integration tests for Todo controller endpoints
 * Tests all CRUD operations, authentication, authorization, and validation
 */
describe('Todo Controller Integration Tests', () => {
  let dbConnection: DatabaseConnection;
  let testUser1: User;
  let testUser2: User;
  let authToken1: string;
  let authToken2: string;
  let testTodo: Todo;

  const TEST_USER_1 = {
    email: 'user1@test.com',
    password: 'Password123!'
  };

  const TEST_USER_2 = {
    email: 'user2@test.com',
    password: 'Password456!'
  };

  const VALID_TODO = {
    title: 'Test Todo',
    description: 'Test Description',
    status: 'pending'
  };

  beforeAll(async () => {
    dbConnection = new DatabaseConnection();
    await dbConnection.connect();
  });

  afterAll(async () => {
    await dbConnection.close();
  });

  beforeEach(async () => {
    // Clean database
    await dbConnection.query('DELETE FROM todos');
    await dbConnection.query('DELETE FROM users');

    // Create test users
    const hashedPassword1 = await bcrypt.hash(TEST_USER_1.password, 10);
    const hashedPassword2 = await bcrypt.hash(TEST_USER_2.password, 10);

    const user1Result = await dbConnection.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [TEST_USER_1.email, hashedPassword1]
    );
    
    const user2Result = await dbConnection.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [TEST_USER_2.email, hashedPassword2]
    );

    testUser1 = user1Result.rows[0];
    testUser2 = user2Result.rows[0];

    // Generate JWT tokens
    authToken1 = jwt.sign(
      { userId: testUser1.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    authToken2 = jwt.sign(
      { userId: testUser2.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create a test todo for user1
    const todoResult = await dbConnection.query(
      'INSERT INTO todos (title, description, status, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [VALID_TODO.title, VALID_TODO.description, VALID_TODO.status, testUser1.id]
    );
    testTodo = todoResult.rows[0];
  });

  describe('POST /api/todos', () => {
    // AC-001: Tests verify all CRUD endpoints return correct status codes
    it('should create todo and return 201 status code', async () => {
      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(VALID_TODO);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(VALID_TODO.title);
      expect(response.body.user_id).toBe(testUser1.id);
    });

    // AC-002: Tests verify authentication required for all endpoints
    it('should return 401 when no auth token provided', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send(VALID_TODO);

      expect(response.status).toBe(401);
    });

    it('should return 401 when invalid auth token provided', async () => {
      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', 'Bearer invalid-token')
        .send(VALID_TODO);

      expect(response.status).toBe(401);
    });

    // AC-004: Tests verify input validation and error responses
    it('should return 400 when title is missing', async () => {
      const invalidTodo = { ...VALID_TODO };
      delete invalidTodo.title;

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(invalidTodo);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when status is invalid', async () => {
      const invalidTodo = {
        ...VALID_TODO,
        status: 'invalid-status'
      };

      const response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(invalidTodo);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/todos', () => {
    // AC-001: Tests verify all CRUD endpoints return correct status codes
    it('should return 200 and user todos', async () => {
      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(testTodo.id);
    });

    // AC-002: Tests verify authentication required for all endpoints
    it('should return 401 when no auth token provided', async () => {
      const response = await request(app)
        .get('/api/todos');

      expect(response.status).toBe(401);
    });

    // AC-003: Tests verify user cannot access other users' todos
    it('should only return todos belonging to authenticated user', async () => {
      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    // AC-005: Tests verify status filtering query parameter
    it('should filter todos by status query parameter', async () => {
      // Create completed todo for user1
      await dbConnection.query(
        'INSERT INTO todos (title, description, status, user_id) VALUES ($1, $2, $3, $4)',
        ['Completed Todo', 'Description', 'completed', testUser1.id]
      );

      const response = await request(app)
        .get('/api/todos?status=pending')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe('pending');
    });

    it('should return empty array for non-matching status filter', async () => {
      const response = await request(app)
        .get('/api/todos?status=completed')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/todos/:id', () => {
    // AC-001: Tests verify all CRUD endpoints return correct status codes
    it('should return 200 and todo details', async () => {
      const response = await request(app)
        .get(`/api/todos/${testTodo.id}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testTodo.id);
      expect(response.body.title).toBe(testTodo.title);
    });

    it('should return 404 when todo not found', async () => {
      const response = await request(app)
        .get('/api/todos/99999')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(404);
    });

    // AC-002: Tests verify authentication required for all endpoints
    it('should return 401 when no auth token provided', async () => {
      const response = await request(app)
        .get(`/api/todos/${testTodo.id}`);

      expect(response.status).toBe(401);
    });

    // AC-003: Tests verify user cannot access other users' todos
    it('should return 404 when accessing other users todo', async () => {
      const response = await request(app)
        .get(`/api/todos/${testTodo.id}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/todos/:id', () => {
    const updateData = {
      title: 'Updated Todo',
      description: 'Updated Description',
      status: 'completed'
    };

    // AC-001: Tests verify all CRUD endpoints return correct status codes
    it('should update todo and return 200 status code', async () => {
      const response = await request(app)
        .put(`/api/todos/${testTodo.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.status).toBe(updateData.status);
    });

    it('should return 404 when todo not found', async () => {
      const response = await request(app)
        .put('/api/todos/99999')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(updateData);

      expect(response.status).toBe(404);
    });

    // AC-002: Tests verify authentication required for all endpoints
    it('should return 401 when no auth token provided', async () => {
      const response = await request(app)
        .put(`/api/todos/${testTodo.id}`)
        .send(updateData);

      expect(response.status).toBe(401);
    });

    // AC-003: Tests verify user cannot access other users' todos
    it('should return 404 when updating other users todo', async () => {
      const response = await request(app)
        .put(`/api/todos/${testTodo.id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send(updateData);

      expect(response.status).toBe(404);
    });

    // AC-004: Tests verify input validation and error responses
    it('should return 400 when status is invalid', async () => {
      const invalidUpdate = {
        ...updateData,
        status: 'invalid-status'
      };

      const response = await request(app)
        .put(`/api/todos/${testTodo.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send(invalidUpdate);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/todos/:id', () => {
    // AC-001: Tests verify all CRUD endpoints return correct status codes
    it('should delete todo and return 204 status code', async () => {
      const response = await request(app)
        .delete(`/api/todos/${testTodo.id}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 when todo not found', async () => {
      const response = await request(app)
        .delete('/api/todos/99999')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(response.status).toBe(404);
    });

    // AC-002: Tests verify authentication required for all endpoints
    it('should return 401 when no auth token provided', async () => {
      const response = await request(app)
        .delete(`/api/todos/${testTodo.id}`);

      expect(response.status).toBe(401);
    });

    // AC-003: Tests verify user cannot access other users' todos
    it('should return 404 when deleting other users todo', async () => {
      const response = await request(app)
        .delete(`/api/todos/${testTodo.id}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(404);
    });
  });
});