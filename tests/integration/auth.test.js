const request = require('supertest');
const app = require('../../src/app');
const { setupTestDb, cleanupTestDb } = require('../helpers/db');

/**
 * Integration tests for authentication endpoints
 * Tests end-to-end flows for user registration and login
 */
describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('POST /api/auth/register', () => {
    /**
     * Test successful user registration with valid email and password
     */
    it('should successfully register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123!'
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
     * Test registration failure when email already exists
     */
    it('should fail when registering with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123!'
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
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    /**
     * Test input validation for registration endpoint
     */
    it('should validate email format', async () => {
      const invalidEmailData = {
        email: 'invalid-email',
        password: 'validPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should validate password requirements', async () => {
      const weakPasswordData = {
        email: 'test@example.com',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    it('should require both email and password', async () => {
      const incompleteData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: 'login@example.com',
      password: 'testPassword123!'
    };

    beforeEach(async () => {
      // Create test user before each login test
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    /**
     * Test successful login with valid credentials
     */
    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
      expect(typeof response.body.token).toBe('string');
    });

    /**
     * Test login failure with invalid email
     */
    it('should fail login with invalid email', async () => {
      const invalidCredentials = {
        email: 'nonexistent@example.com',
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidCredentials)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    /**
     * Test login failure with invalid password
     */
    it('should fail login with invalid password', async () => {
      const invalidCredentials = {
        email: testUser.email,
        password: 'wrongPassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidCredentials)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    /**
     * Test input validation for login endpoint
     */
    it('should validate required fields for login', async () => {
      const incompleteData = {
        email: testUser.email
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate email format for login', async () => {
      const invalidData = {
        email: 'not-an-email',
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });
  });
});