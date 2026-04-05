import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { testConfig } from '../config/test-config';

const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '30000', 10);

describe('Todos Integration Tests', () => {
  let dbManager: DatabaseManager;
  let userToken: string;
  let userId: number;

  beforeAll(async () => {
    dbManager = DatabaseManager.getInstance();
    await setupTestDatabase();
    const authData = await createTestUser();
    userToken = authData.token;
    userId = authData.userId;
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await cleanupTestDatabase();
    await dbManager.close();
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    await clearTodoData();
  });

  /**
   * AC-002: Test authenticated todo CRUD operations
   */
  describe('Authenticated Todo CRUD Operations', () => {
    it('should create, read, update, and delete todos', async () => {
      const todoData = {
        title: 'Test Todo',
        description: 'Test Description',
        due_date: '2024-12-31T23:59:59.000Z'
      };

      // Create todo
      const createStart = Date.now();
      const createResponse = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${userToken}`)
        .send(todoData)
        .expect(201);
      const createTime = Date.now() - createStart;

      expect(createResponse.body).toHaveProperty('message', 'Todo created successfully');
      expect(createResponse.body).toHaveProperty('todo');
      expect(createResponse.body.todo).toHaveProperty('id');
      expect(createResponse.body.todo).toHaveProperty('title', todoData.title);
      expect(createResponse.body.todo).toHaveProperty('status', 'open');
      expect(createTime).toBeLessThan(500);

      const todoId = createResponse.body.todo.id;

      // Read todos
      const readStart = Date.now();
      const readResponse = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      const readTime = Date.now() - readStart;

      expect(readResponse.body).toHaveProperty('todos');
      expect(readResponse.body.todos).toHaveLength(1);
      expect(readResponse.body.todos[0]).toHaveProperty('id', todoId);
      expect(readTime).toBeLessThan(500);

      // Update todo
      const updateData = { status: 'done' };
      const updateStart = Date.now();
      const updateResponse = await request(app)
        .put(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);
      const updateTime = Date.now() - updateStart;

      expect(updateResponse.body).toHaveProperty('message', 'Todo updated successfully');
      expect(updateResponse.body.todo).toHaveProperty('status', 'done');
      expect(updateTime).toBeLessThan(500);

      // Delete todo
      const deleteStart = Date.now();
      const deleteResponse = await request(app)
        .delete(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      const deleteTime = Date.now() - deleteStart;

      expect(deleteResponse.body).toHaveProperty('message', 'Todo deleted successfully');
      expect(deleteTime).toBeLessThan(500);

      // Verify deletion
      const verifyResponse = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(verifyResponse.body.todos).toHaveLength(0);
    });

    it('should reject unauthenticated requests with 401 status', async () => {
      const response = await request(app)
        .get('/api/todos')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message', 'Access denied. No token provided');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should reject invalid token with 403 status', async () => {
      const response = await request(app)
        .get('/api/todos')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message', 'Invalid token');
      expect(response.body).toHaveProperty('statusCode', 403);
    });
  });

  /**
   * AC-003: Test user isolation end-to-end
   */
  describe('User Isolation', () => {
    it('should isolate todos between different users', async () => {
      // Create second user
      const user2Data = await createTestUser('user2@example.com');
      const user2Token = user2Data.token;

      // User 1 creates a todo
      const todo1Response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'User 1 Todo' })
        .expect(201);

      // User 2 creates a todo
      const todo2Response = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'User 2 Todo' })
        .expect(201);

      // User 1 should only see their todo
      const user1Todos = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(user1Todos.body.todos).toHaveLength(1);
      expect(user1Todos.body.todos[0]).toHaveProperty('title', 'User 1 Todo');

      // User 2 should only see their todo
      const user2Todos = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(user2Todos.body.todos).toHaveLength(1);
      expect(user2Todos.body.todos[0]).toHaveProperty('title', 'User 2 Todo');

      // User 1 cannot access User 2's todo
      const todo2Id = todo2Response.body.todo.id;
      const unauthorizedResponse = await request(app)
        .get(`/api/todos/${todo2Id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(unauthorizedResponse.body).toHaveProperty('error');
      expect(unauthorizedResponse.body).toHaveProperty('message', 'Todo not found');
      expect(unauthorizedResponse.body).toHaveProperty('statusCode', 404);
    });
  });

  /**
   * AC-006: Test concurrent user scenarios
   */
  describe('Concurrent User Scenarios', () => {
    it('should handle concurrent todo creation', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/todos')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ title: `Concurrent Todo ${i}` })
      );

      const start = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - start;

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('todo');
      });

      // Verify all todos were created
      const todosResponse = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(todosResponse.body.todos).toHaveLength(10);
      expect(totalTime).toBeLessThan(5000); // 10 requests should complete within 5 seconds
    });
  });

  async function setupTestDatabase(): Promise<void> {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createTodosTable = `
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await dbManager.query(createUsersTable);
    await dbManager.query(createTodosTable);
  }

  async function cleanupTestDatabase(): Promise<void> {
    await dbManager.query('DROP TABLE IF EXISTS todos CASCADE');
    await dbManager.query('DROP TABLE IF EXISTS users CASCADE');
  }

  async function clearTodoData(): Promise<void> {
    await dbManager.query('DELETE FROM todos');
  }

  async function createTestUser(email = 'testuser@example.com'): Promise<{ token: string; userId: number }> {
    const userData = {
      email,
      password: 'SecurePass123!'
    };

    await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send(userData)
      .expect(200);

    return {
      token: loginResponse.body.token,
      userId: loginResponse.body.user.id
    };
  }
});