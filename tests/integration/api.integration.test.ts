import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseManager } from '../../src/infrastructure/database/DatabaseManager';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const PERFORMANCE_THRESHOLD_MS = 500;
const CONCURRENT_USERS_COUNT = 10;

/**
 * Integration tests for complete API workflows and system integration.
 * Validates end-to-end user scenarios and performance requirements.
 */
describe('API Integration Tests', () => {
  let dbManager: DatabaseManager;
  
  beforeAll(async () => {
    dbManager = new DatabaseManager();
    await dbManager.connect();
    await dbManager.migrate();
  });
  
  afterAll(async () => {
    await dbManager.disconnect();
  });
  
  beforeEach(async () => {
    await dbManager.clearTestData();
  });
  
  describe('AC-001: Complete user registration and login flow', () => {
    it('should complete full registration and login workflow', async () => {
      const testUser = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };
      
      // Registration
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
      
      expect(registerResponse.body).toHaveProperty('message', 'User registered successfully');
      expect(registerResponse.body).toHaveProperty('userId');
      
      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);
      
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body).toHaveProperty('userId');
      expect(typeof loginResponse.body.token).toBe('string');
    });
    
    it('should prevent duplicate email registration', async () => {
      const testUser = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!'
      };
      
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
      
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);
    });
  });
  
  describe('AC-002: Authenticated todo CRUD operations', () => {
    let authToken: string;
    let userId: string;
    
    beforeEach(async () => {
      const testUser = {
        email: 'todouser@example.com',
        password: 'SecurePassword123!'
      };
      
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(testUser);
      
      authToken = loginResponse.body.token;
      userId = loginResponse.body.userId;
    });
    
    it('should complete full CRUD workflow for todos', async () => {
      const todoData = {
        title: 'Test Todo',
        description: 'Test Description',
        due_date: '2024-12-31T23:59:59Z'
      };
      
      // Create
      const createResponse = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(todoData)
        .expect(201);
      
      const todoId = createResponse.body.id;
      expect(createResponse.body.status).toBe('open');
      
      // Read
      const getResponse = await request(app)
        .get(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(getResponse.body.title).toBe(todoData.title);
      
      // Update
      const updateData = { ...todoData, status: 'done' };
      const updateResponse = await request(app)
        .put(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(updateResponse.body.status).toBe('done');
      
      // Delete
      await request(app)
        .delete(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
      
      // Verify deletion
      await request(app)
        .get(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
    
    it('should require authentication for all todo operations', async () => {
      await request(app)
        .get('/api/todos')
        .expect(401);
      
      await request(app)
        .post('/api/todos')
        .send({ title: 'Test' })
        .expect(401);
    });
  });
  
  describe('AC-003: User isolation end-to-end', () => {
    let user1Token: string;
    let user2Token: string;
    let user1TodoId: string;
    
    beforeEach(async () => {
      // Create two users
      const user1 = { email: 'user1@example.com', password: 'Password123!' };
      const user2 = { email: 'user2@example.com', password: 'Password123!' };
      
      await request(app).post('/api/auth/register').send(user1);
      await request(app).post('/api/auth/register').send(user2);
      
      const login1 = await request(app).post('/api/auth/login').send(user1);
      const login2 = await request(app).post('/api/auth/login').send(user2);
      
      user1Token = login1.body.token;
      user2Token = login2.body.token;
      
      // Create todo for user1
      const todoResponse = await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'User 1 Todo' });
      
      user1TodoId = todoResponse.body.id;
    });
    
    it('should prevent users from accessing other users todos', async () => {
      // User2 cannot access User1's todo
      await request(app)
        .get(`/api/todos/${user1TodoId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);
      
      // User2 cannot update User1's todo
      await request(app)
        .put(`/api/todos/${user1TodoId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'Hacked' })
        .expect(404);
      
      // User2 cannot delete User1's todo
      await request(app)
        .delete(`/api/todos/${user1TodoId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);
    });
    
    it('should only return user-owned todos in list endpoint', async () => {
      await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'User 2 Todo' });
      
      const user1Todos = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      
      const user2Todos = await request(app)
        .get('/api/todos')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);
      
      expect(user1Todos.body).toHaveLength(1);
      expect(user2Todos.body).toHaveLength(1);
      expect(user1Todos.body[0].title).toBe('User 1 Todo');
      expect(user2Todos.body[0].title).toBe('User 2 Todo');
    });
  });
  
  describe('AC-004: HTTP status codes', () => {
    let authToken: string;
    
    beforeEach(async () => {
      const user = { email: 'statustest@example.com', password: 'Password123!' };
      await request(app).post('/api/auth/register').send(user);
      const loginResponse = await request(app).post('/api/auth/login').send(user);
      authToken = loginResponse.body.token;
    });
    
    it('should return correct status codes for all scenarios', async () => {
      // 201 Created
      await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Todo' })
        .expect(201);
      
      // 400 Bad Request
      await request(app)
        .post('/api/todos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' })
        .expect(400);
      
      // 401 Unauthorized
      await request(app)
        .get('/api/todos')
        .expect(401);
      
      // 404 Not Found
      await request(app)
        .get('/api/todos/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      // 409 Conflict (duplicate email)
      const user = { email: 'duplicate@example.com', password: 'Password123!' };
      await request(app).post('/api/auth/register').send(user).expect(201);
      await request(app).post('/api/auth/register').send(user).expect(409);
    });
  });
  
  describe('AC-005: API response times under 500ms', () => {
    let authToken: string;
    
    beforeEach(async () => {
      const user = { email: 'perftest@example.com', password: 'Password123!' };
      await request(app).post('/api/auth/register').send(user);
      const loginResponse = await request(app).post('/api/auth/login').send(user);
      authToken = loginResponse.body.token;
    });
    
    it('should respond to all endpoints within 500ms', async () => {
      const testCases = [
        () => request(app).post('/api/auth/register').send({
          email: `perf${Date.now()}@example.com`,
          password: 'Password123!'
        }),
        () => request(app).post('/api/auth/login').send({
          email: 'perftest@example.com',
          password: 'Password123!'
        }),
        () => request(app)
          .post('/api/todos')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Performance Test Todo' }),
        () => request(app)
          .get('/api/todos')
          .set('Authorization', `Bearer ${authToken}`)
      ];
      
      for (const testCase of testCases) {
        const startTime = Date.now();
        await testCase();
        const responseTime = Date.now() - startTime;
        
        expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      }
    });
  });
  
  describe('AC-006: Concurrent user scenarios', () => {
    it('should handle concurrent user registrations', async () => {
      const registrations = Array.from({ length: CONCURRENT_USERS_COUNT }, (_, i) => 
        request(app)
          .post('/api/auth/register')
          .send({
            email: `concurrent${i}@example.com`,
            password: 'Password123!'
          })
      );
      
      const results = await Promise.all(registrations);
      
      results.forEach(response => {
        expect(response.status).toBe(201);
      });
    });
    
    it('should handle concurrent todo operations by different users', async () => {
      // Create multiple users
      const users = Array.from({ length: CONCURRENT_USERS_COUNT }, (_, i) => ({
        email: `concuser${i}@example.com`,
        password: 'Password123!'
      }));
      
      // Register all users
      await Promise.all(
        users.map(user => request(app).post('/api/auth/register').send(user))
      );
      
      // Login all users
      const loginPromises = users.map(user => 
        request(app).post('/api/auth/login').send(user)
      );
      const loginResults = await Promise.all(loginPromises);
      
      // Create todos concurrently
      const todoPromises = loginResults.map((result, i) => 
        request(app)
          .post('/api/todos')
          .set('Authorization', `Bearer ${result.body.token}`)
          .send({ title: `Concurrent Todo ${i}` })
      );
      
      const todoResults = await Promise.all(todoPromises);
      
      todoResults.forEach(response => {
        expect(response.status).toBe(201);
      });
      
      // Verify user isolation maintained under concurrency
      const listPromises = loginResults.map(result => 
        request(app)
          .get('/api/todos')
          .set('Authorization', `Bearer ${result.body.token}`)
      );
      
      const listResults = await Promise.all(listPromises);
      
      listResults.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1); // Each user should only see their own todo
      });
    });
  });
});
