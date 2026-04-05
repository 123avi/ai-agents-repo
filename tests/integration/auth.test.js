const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const db = require('../../src/config/database');
const bcrypt = require('bcrypt');

/**
 * Integration tests for user login endpoint
 * Tests authentication flow and JWT token generation
 */
describe('POST /api/auth/login', () => {
  let testUser;
  const TEST_USER_EMAIL = 'test@example.com';
  const TEST_USER_PASSWORD = 'testPassword123';
  const INVALID_PASSWORD = 'wrongPassword';
  const NON_EXISTENT_EMAIL = 'nonexistent@example.com';
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  const EXPECTED_TOKEN_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await cleanupTestUser();
  });

  afterAll(async () => {
    await db.end();
  });

  /**
   * AC-001: Test successful login returns 200 with JWT token
   */
  describe('successful login', () => {
    it('should return 200 status with JWT token for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.token).toBeTruthy();
    });
  });

  /**
   * AC-002: Test invalid credentials return 401 status
   */
  describe('invalid credentials', () => {
    it('should return 401 for wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: INVALID_PASSWORD
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  /**
   * AC-003: Test non-existent user returns 401 status
   */
  describe('non-existent user', () => {
    it('should return 401 for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: NON_EXISTENT_EMAIL,
          password: TEST_USER_PASSWORD
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  /**
   * AC-004: Verify JWT token contains correct user ID
   */
  describe('JWT token validation', () => {
    it('should contain correct user ID in JWT payload', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        });

      const token = response.body.data.token;
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.email).toBe(TEST_USER_EMAIL);
    });
  });

  /**
   * AC-005: Test token expiration is set correctly
   */
  describe('token expiration', () => {
    it('should set token expiration to 24 hours', async () => {
      const beforeLogin = Math.floor(Date.now() / 1000);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        });

      const token = response.body.data.token;
      const decoded = jwt.verify(token, JWT_SECRET);
      const expectedExpiry = beforeLogin + EXPECTED_TOKEN_EXPIRY;
      
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 60); // Allow 60s variance
    });
  });

  /**
   * Creates a test user in the database
   * @returns {Promise<Object>} Created user object
   */
  async function createTestUser() {
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 12);
    const query = `
      INSERT INTO users (email, password, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING id, email
    `;
    
    const result = await db.query(query, [TEST_USER_EMAIL, hashedPassword]);
    return result.rows[0];
  }

  /**
   * Removes test user from database
   */
  async function cleanupTestUser() {
    if (testUser) {
      await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
      testUser = null;
    }
  }

  /**
   * Sets up test database connection and ensures tables exist
   */
  async function setupTestDatabase() {
    // Ensure users table exists for tests
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await db.query(createTableQuery);
  }
});