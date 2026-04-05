const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const db = require('../../src/config/database');

/**
 * Test suite for user registration endpoint
 * Tests all registration scenarios including validation and database interactions
 */
describe('POST /api/auth/register', () => {
  // Clean database before each test
  beforeEach(async () => {
    await db.query('DELETE FROM users');
  });

  afterAll(async () => {
    await db.end();
  });

  /**
   * AC-001: Test successful registration returns 201 and user ID
   */
  test('should register new user successfully', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('userId');
    expect(typeof response.body.data.userId).toBe('number');
    expect(response.body.data.email).toBe(userData.email);
  });

  /**
   * AC-002: Test duplicate email returns 409 status
   */
  test('should return 409 for duplicate email', async () => {
    const userData = {
      email: 'duplicate@example.com',
      password: 'SecurePass123!',
      name: 'First User'
    };

    // Register first user
    await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    // Attempt to register with same email
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'DifferentPass456!',
        name: 'Second User'
      })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('EMAIL_EXISTS');
  });

  /**
   * AC-003: Test invalid email format returns 400 status
   */
  test('should return 400 for invalid email format', async () => {
    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'user@',
      'user..name@example.com',
      ''
    ];

    for (const invalidEmail of invalidEmails) {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: invalidEmail,
          password: 'SecurePass123!',
          name: 'Test User'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  /**
   * AC-004: Test missing fields return 400 status
   */
  test('should return 400 for missing required fields', async () => {
    const testCases = [
      { email: 'test@example.com', password: 'SecurePass123!' }, // missing name
      { email: 'test@example.com', name: 'Test User' }, // missing password
      { password: 'SecurePass123!', name: 'Test User' }, // missing email
      {} // missing all fields
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testCase)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  /**
   * AC-005: Verify password is hashed in database
   */
  test('should hash password before storing in database', async () => {
    const userData = {
      email: 'hash-test@example.com',
      password: 'PlainTextPassword123!',
      name: 'Hash Test User'
    };

    await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    // Query database directly to check password
    const result = await db.query(
      'SELECT password FROM users WHERE email = $1',
      [userData.email]
    );

    const storedPassword = result.rows[0].password;

    // Verify password is not stored as plain text
    expect(storedPassword).not.toBe(userData.password);

    // Verify password is properly hashed with bcrypt
    const isValidHash = await bcrypt.compare(userData.password, storedPassword);
    expect(isValidHash).toBe(true);

    // Verify hash follows bcrypt format
    expect(storedPassword).toMatch(/^\$2[aby]\$\d+\$/);
  });

  test('should handle empty request body', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send()
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('should reject weak passwords', async () => {
    const weakPasswords = [
      '123',
      'password',
      '12345678'
    ];

    for (const weakPassword of weakPasswords) {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'weak-pass@example.com',
          password: weakPassword,
          name: 'Test User'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});