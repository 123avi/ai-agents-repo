import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { testConfig } from '../config/test-config';

const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '30000', 10);

describe('Auth Integration Tests', () => {
  let dbManager: DatabaseManager;

  beforeAll(async () => {
    dbManager = DatabaseManager.getInstance();
    await setupTestDatabase();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await cleanupTestDatabase();
    await dbManager.close();
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    await clearUserData();
  });

  /**
   * AC-001: Test complete user registration and login flow
   */
  describe('Complete Registration and Login Flow', () => {
    it('should successfully register and login a user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      // Test registration
      const registerStart = Date.now();
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      const registerTime = Date.now() - registerStart;

      expect(registerResponse.body).toHaveProperty('message', 'User registered successfully');
      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body.user).toHaveProperty('email', userData.email);
      expect(registerResponse.body.user).not.toHaveProperty('password');
      expect(registerTime).toBeLessThan(500);

      // Test login
      const loginStart = Date.now();
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(userData)
        .expect(200);
      const loginTime = Date.now() - loginStart;

      expect(loginResponse.body).toHaveProperty('message', 'Login successful');
      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body.user).toHaveProperty('email', userData.email);
      expect(loginTime).toBeLessThan(500);

      // Verify JWT token format
      const token = loginResponse.body.token;
      expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it('should reject duplicate email registration with proper error structure', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message', 'User already exists');
      expect(response.body).toHaveProperty('statusCode', 409);
    });

    it('should reject invalid credentials with 401 status', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Wrong password
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: 'wrongpassword' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });

  /**
   * AC-004: Test all required HTTP status codes
   */
  describe('HTTP Status Codes', () => {
    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: 'SecurePass123!' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: '123' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('password');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 404 for non-existent user login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'SecurePass123!' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message', 'User not found');
      expect(response.body).toHaveProperty('statusCode', 404);
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
    await dbManager.query(createUsersTable);
  }

  async function cleanupTestDatabase(): Promise<void> {
    await dbManager.query('DROP TABLE IF EXISTS users CASCADE');
  }

  async function clearUserData(): Promise<void> {
    await dbManager.query('DELETE FROM users');
  }
});