const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { createTestUser, cleanupTestUser, setupTestDatabase } = require('../utils/testHelpers');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for tests');
}

describe('POST /api/auth/login', () => {
  const TEST_USER_EMAIL = 'testuser@example.com';
  const TEST_USER_PASSWORD = 'TestPass123!';
  let testUserId;

  beforeAll(async () => {
    await setupTestDatabase();
    testUserId = await createTestUser(TEST_USER_EMAIL, TEST_USER_PASSWORD);
  });

  afterAll(async () => {
    await cleanupTestUser(testUserId);
  });

  describe('AC-001: Test successful login returns 200 with JWT token', () => {
    it('should return 200 and JWT token for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(typeof response.body.data.token).toBe('string');
    });
  });

  describe('AC-002: Test invalid credentials return 401 status', () => {
    it('should return 401 for wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('AC-003: Test non-existent user returns 401 status', () => {
    it('should return 401 for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('AC-004: Verify JWT token contains correct user ID', () => {
    it('should return JWT token with correct user ID in payload', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        })
        .expect(200);

      const token = response.body.data.token;
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.email).toBe(TEST_USER_EMAIL);
    });
  });

  describe('AC-005: Test token expiration is set correctly', () => {
    it('should set token expiration to 24 hours', async () => {
      const beforeLogin = Math.floor(Date.now() / 1000);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        })
        .expect(200);

      const token = response.body.data.token;
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const expectedExpiration = beforeLogin + (24 * 60 * 60); // 24 hours
      const actualExpiration = decoded.exp;
      
      // Allow 5 second tolerance for test execution time
      expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpiration - 5);
      expect(actualExpiration).toBeLessThanOrEqual(expectedExpiration + 5);
    });
  });
});