import request from 'supertest';
import { app } from '../../src/app';
import { setupTestDb, cleanupTestDb, closeTestDb } from '../helpers/db-helpers';

/**
 * Integration tests for authentication endpoints.
 * Tests user registration and login flows with database integration.
 */
describe('Authentication Endpoints', () => {
  // Set timeout for database operations
  jest.setTimeout(30000);

  beforeAll(async () => {
    try {
      await setupTestDb();
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  });

  beforeEach(async () => {
    try {
      await cleanupTestDb();
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await closeTestDb();
    } catch (error) {
      console.error('Failed to close test database:', error);
    }
  });

  describe('POST /api/auth/register', () => {
    /**
     * Test successful user registration flow
     * Covers AC-001: Test successful user registration flow
     */
    it('should successfully register a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(userData.email);
      expect(response.body).not.toHaveProperty('password');
    });

    /**
     * Test duplicate email registration failure
     * Covers AC-002: Test duplicate email registration failure
     */
    it('should reject registration with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!'
      };

      // First registration should succeed
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/email.*already.*exists/i);
    });

    /**
     * Test input validation error responses for registration
     * Covers AC-005: Test input validation error responses
     */
    it('should reject registration with invalid email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/email.*valid/i);
    });

    /**
     * Test password validation requirements
     * Covers AC-005: Test input validation error responses
     */
    it('should reject registration with weak password', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/password/i);
    });

    /**
     * Test missing required fields validation
     * Covers AC-005: Test input validation error responses
     */
    it('should reject registration with missing required fields', async () => {
      const incompleteData = {
        email: 'test@example.com'
        // password missing
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/password.*required/i);
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: 'logintest@example.com',
      password: 'SecurePass123!'
    };

    beforeEach(async () => {
      // Create test user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
    });

    /**
     * Test successful login with valid credentials
     * Covers AC-003: Test successful login with valid credentials
     */
    it('should successfully log in with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    /**
     * Test login failure with invalid password
     * Covers AC-004: Test login failure with invalid credentials
     */
    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid.*credentials/i);
    });

    /**
     * Test login failure with non-existent email
     * Covers AC-004: Test login failure with invalid credentials
     */
    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid.*credentials/i);
    });

    /**
     * Test login validation with missing credentials
     * Covers AC-005: Test input validation error responses
     */
    it('should reject login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: testUser.password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/email.*required/i);
    });

    /**
     * Test login validation with missing password
     * Covers AC-005: Test input validation error responses
     */
    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/password.*required/i);
    });
  });
});