import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseConnection } from '../../src/infrastructure/database';
import { JwtService } from '../../src/services/auth.service';
import { TestDataBuilder } from '../utils/test-data-builder';

const API_BASE_PATH = '/api/todos';
const AUTH_ENDPOINT = '/api/auth/login';
const REGISTER_ENDPOINT = '/api/auth/register';

describe('Todo Controller Integration Tests', () => {
  let dbConnection: DatabaseConnection;
  let authToken: string;
  let secondUserToken: string;
  let testUserId: string;
  let secondUserId: string;

  beforeAll(async () => {
    dbConnection = await DatabaseConnection.getInstance();
    await dbConnection.connect();
  });

  afterAll(async () => {
    await dbConnection.disconnect();
  });

  beforeEach(async () => {
    await dbConnection.clearDatabase();
    
    // Create primary test user
    const primaryUser = TestDataBuilder.createUser();
    await request(app)
      .post(REGISTER_ENDPOINT)
      .send(primaryUser);
    
    const primaryLoginResponse = await request(app)
      .post(AUTH_ENDPOINT)
      .send({
        email: primaryUser.email,
        password: primaryUser.password
      });
    
    authToken = primaryLoginResponse.body.token;
    testUserId = JwtService.decode(authToken).userId;

    // Create secondary test user for isolation tests
    const secondaryUser = TestDataBuilder.createUser();
    await request(app)
      .post(REGISTER_ENDPOINT)
      .send(secondaryUser);
    
    const secondaryLoginResponse = await request(app)
      .post(AUTH_ENDPOINT)
      .send({
        email: secondaryUser.email,
        password: secondaryUser.password
      });
    
    secondUserToken = secondaryLoginResponse.body.token;
    secondUserId = JwtService.decode(secondUserToken).userId;
  });

  describe('AC-001: CRUD Operations Success Paths', () => {
    it('should create a new todo successfully', async () => {
      const todoData = TestDataBuilder.createTodoRequest();
      
      const response = await request(app)
        .post(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .send(todoData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(todoData.title);
      expect(response.body.description).toBe(todoData.description);
      expect(response.body.status).toBe('open');
    });

    it('should retrieve all todos for authenticated user', async () => {
      const todo1 = await createTodoForUser(authToken);
      const todo2 = await createTodoForUser(authToken);
      
      const response = await request(app)
        .get(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map(t => t.id)).toContain(todo1.id);
      expect(response.body.map(t => t.id)).toContain(todo2.id);
    });

    it('should retrieve specific todo by id', async () => {
      const todo = await createTodoForUser(authToken);
      
      const response = await request(app)
        .get(`${API_BASE_PATH}/${todo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(todo.id);
      expect(response.body.title).toBe(todo.title);
    });

    it('should update todo successfully', async () => {
      const todo = await createTodoForUser(authToken);
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'done'
      };
      
      const response = await request(app)
        .put(`${API_BASE_PATH}/${todo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.status).toBe(updateData.status);
    });

    it('should delete todo successfully', async () => {
      const todo = await createTodoForUser(authToken);
      
      await request(app)
        .delete(`${API_BASE_PATH}/${todo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      await request(app)
        .get(`${API_BASE_PATH}/${todo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('AC-002: Authentication Requirement Enforcement', () => {
    it('should reject requests without authentication token', async () => {
      const todoData = TestDataBuilder.createTodoRequest();
      
      await request(app)
        .post(API_BASE_PATH)
        .send(todoData)
        .expect(401);

      await request(app)
        .get(API_BASE_PATH)
        .expect(401);

      await request(app)
        .get(`${API_BASE_PATH}/123`)
        .expect(401);

      await request(app)
        .put(`${API_BASE_PATH}/123`)
        .send(todoData)
        .expect(401);

      await request(app)
        .delete(`${API_BASE_PATH}/123`)
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      const todoData = TestDataBuilder.createTodoRequest();
      const invalidToken = 'invalid.jwt.token';
      
      await request(app)
        .post(API_BASE_PATH)
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(todoData)
        .expect(401);
    });

    it('should reject requests with expired token', async () => {
      const expiredToken = JwtService.generateExpiredToken(testUserId);
      const todoData = TestDataBuilder.createTodoRequest();
      
      await request(app)
        .post(API_BASE_PATH)
        .set('Authorization', `Bearer ${expiredToken}`)
        .send(todoData)
        .expect(401);
    });
  });

  describe('AC-003: User Isolation Security', () => {
    it('should not return todos belonging to other users', async () => {
      await createTodoForUser(authToken);
      await createTodoForUser(secondUserToken);
      
      const response = await request(app)
        .get(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      response.body.forEach(todo => {
        expect(todo.userId).toBe(testUserId);
      });
    });

    it('should not allow access to other users todos by id', async () => {
      const otherUserTodo = await createTodoForUser(secondUserToken);
      
      await request(app)
        .get(`${API_BASE_PATH}/${otherUserTodo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should not allow updating other users todos', async () => {
      const otherUserTodo = await createTodoForUser(secondUserToken);
      const updateData = { title: 'Hacked Title' };
      
      await request(app)
        .put(`${API_BASE_PATH}/${otherUserTodo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should not allow deleting other users todos', async () => {
      const otherUserTodo = await createTodoForUser(secondUserToken);
      
      await request(app)
        .delete(`${API_BASE_PATH}/${otherUserTodo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('AC-004: HTTP Status Code Correctness', () => {
    it('should return 201 for successful todo creation', async () => {
      const todoData = TestDataBuilder.createTodoRequest();
      
      await request(app)
        .post(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .send(todoData)
        .expect(201);
    });

    it('should return 200 for successful retrieval operations', async () => {
      const todo = await createTodoForUser(authToken);
      
      await request(app)
        .get(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app)
        .get(`${API_BASE_PATH}/${todo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should return 200 for successful update operations', async () => {
      const todo = await createTodoForUser(authToken);
      
      await request(app)
        .put(`${API_BASE_PATH}/${todo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated' })
        .expect(200);
    });

    it('should return 204 for successful deletion', async () => {
      const todo = await createTodoForUser(authToken);
      
      await request(app)
        .delete(`${API_BASE_PATH}/${todo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 404 for non-existent todos', async () => {
      const nonExistentId = '999999';
      
      await request(app)
        .get(`${API_BASE_PATH}/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      await request(app)
        .put(`${API_BASE_PATH}/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Update' })
        .expect(404);

      await request(app)
        .delete(`${API_BASE_PATH}/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 for invalid request data', async () => {
      await request(app)
        .post(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      await request(app)
        .post(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '' })
        .expect(400);
    });
  });

  describe('AC-005: Response Body Formats', () => {
    it('should return todo with all required fields on creation', async () => {
      const todoData = TestDataBuilder.createTodoRequest();
      
      const response = await request(app)
        .post(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .send(todoData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('due_date');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
    });

    it('should return array of todos for list endpoint', async () => {
      await createTodoForUser(authToken);
      await createTodoForUser(authToken);
      
      const response = await request(app)
        .get(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      response.body.forEach(todo => {
        expect(todo).toHaveProperty('id');
        expect(todo).toHaveProperty('title');
        expect(todo).toHaveProperty('status');
      });
    });

    it('should return error format for validation failures', async () => {
      const response = await request(app)
        .post(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('AC-006: Error Scenarios', () => {
    it('should handle invalid todo status values', async () => {
      const todoData = {
        ...TestDataBuilder.createTodoRequest(),
        status: 'invalid_status'
      };
      
      await request(app)
        .post(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .send(todoData)
        .expect(400);
    });

    it('should handle malformed JSON requests', async () => {
      await request(app)
        .post(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle database connection errors gracefully', async () => {
      await dbConnection.simulateConnectionError();
      
      const response = await request(app)
        .get(API_BASE_PATH)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Internal server error');
      
      await dbConnection.restoreConnection();
    });

    it('should handle concurrent update conflicts', async () => {
      const todo = await createTodoForUser(authToken);
      
      // Simulate concurrent updates
      const update1Promise = request(app)
        .put(`${API_BASE_PATH}/${todo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Update 1' });
        
      const update2Promise = request(app)
        .put(`${API_BASE_PATH}/${todo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Update 2' });

      const [response1, response2] = await Promise.all([update1Promise, update2Promise]);
      
      // One should succeed, the other should handle the conflict
      const successCount = [response1, response2].filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  /**
   * Helper function to create a todo for a specific user
   * @param token - JWT token for authentication
   * @returns Promise<TodoResponse> - Created todo data
   */
  async function createTodoForUser(token: string) {
    const todoData = TestDataBuilder.createTodoRequest();
    const response = await request(app)
      .post(API_BASE_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send(todoData)
      .expect(201);
    
    return response.body;
  }
});