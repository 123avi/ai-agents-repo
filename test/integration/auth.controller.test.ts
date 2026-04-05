import request from 'supertest';
import { app } from '../../src/app';
import { AuthRepository } from '../../src/repositories/auth.repository';
import { DatabaseConnection } from '../../src/config/database';
import bcrypt from 'bcrypt';

/**
 * Integration tests for Auth Controller endpoints
 * Tests registration, login, HTTP responses, and request validation
 */
describe('Auth Controller Integration Tests', () => {
  let authRepository: AuthRepository;
  let dbConnection: DatabaseConnection;

  const VALID_USER = {
    email: 'test@example.com',
    password: 'ValidPass123!'
  };

  const INVALID_EMAILS = [
    'invalid-email',
    'missing@domain',
    '@missinglocal.com',
    ''
  ];

  const INVALID_PASSWORDS = [
    'short',
    '12345678',
    'nouppercaseorspecial',
    'NOLOWERCASEORSPECIAL'
  ];

  beforeAll(async () => {
    dbConnection = new DatabaseConnection();
    await dbConnection.connect();
    authRepository = new AuthRepository(dbConnection);
  });

  beforeEach(async () => {
    await dbConnection.query('DELETE FROM users WHERE email LIKE \'%test%\'');
  });

  afterAll(async () => {
    await dbConnection.close();
  });

  describe('POST /api/auth/register', () => {
    describe('Success Cases (AC-001)', () => {
      it('should register new user with valid data', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(VALID_USER)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          user: {
            id: expect.any(Number),
            email: VALID_USER.email
          }
        });
        expect(response.body.user.password).toBeUndefined();
      });

      it('should hash password before storage', async () => {
        await request(app)
          .post('/api/auth/register')
          .send(VALID_USER)
          .expect(201);

        const user = await authRepository.findByEmail(VALID_USER.email);
        expect(user).toBeDefined();
        expect(user!.password).not.toBe(VALID_USER.password);
        expect(await bcrypt.compare(VALID_USER.password, user!.password)).toBe(true);
      });
    });

    describe('Error Cases (AC-001)', () => {
      it('should return 400 for duplicate email', async () => {
        await request(app)
          .post('/api/auth/register')
          .send(VALID_USER)
          .expect(201);

        const response = await request(app)
          .post('/api/auth/register')
          .send(VALID_USER)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.stringContaining('already exists')
        });
      });

      it.each(INVALID_EMAILS)('should return 400 for invalid email: %s', async (email) => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ email, password: VALID_USER.password })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.stringContaining('email')
        });
      });

      it.each(INVALID_PASSWORDS)('should return 400 for invalid password: %s', async (password) => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ email: VALID_USER.email, password })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.stringContaining('password')
        });
      });
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send(VALID_USER);
    });

    describe('Success Cases (AC-002)', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send(VALID_USER)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          token: expect.any(String),
          user: {
            id: expect.any(Number),
            email: VALID_USER.email
          }
        });
        expect(response.body.user.password).toBeUndefined();
      });

      it('should return valid JWT token', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send(VALID_USER)
          .expect(200);

        const token = response.body.token;
        expect(token).toBeTruthy();
        expect(token.split('.')).toHaveLength(3);
      });
    });

    describe('Error Cases (AC-002)', () => {
      it('should return 401 for non-existent email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: VALID_USER.password
          })
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.stringContaining('Invalid credentials')
        });
      });

      it('should return 401 for wrong password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: VALID_USER.email,
            password: 'WrongPassword123!'
          })
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.stringContaining('Invalid credentials')
        });
      });

      it('should return 400 for missing email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: VALID_USER.password })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.stringContaining('email')
        });
      });

      it('should return 400 for missing password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: VALID_USER.email })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.stringContaining('password')
        });
      });
    });
  });

  describe('HTTP Status Code Correctness (AC-003)', () => {
    it('should return 201 for successful registration', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(VALID_USER)
        .expect(201);
    });

    it('should return 200 for successful login', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(VALID_USER);

      await request(app)
        .post('/api/auth/login')
        .send(VALID_USER)
        .expect(200);
    });

    it('should return 400 for validation errors', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid', password: '123' })
        .expect(400);
    });

    it('should return 401 for authentication failures', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })
        .expect(401);
    });

    it('should return 404 for non-existent endpoints', async () => {
      await request(app)
        .post('/api/auth/invalid')
        .send(VALID_USER)
        .expect(404);
    });
  });

  describe('Response Body Format (AC-004)', () => {
    it('should have consistent success response structure', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(VALID_USER)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        user: {
          id: expect.any(Number),
          email: VALID_USER.email
        }
      });
    });

    it('should have consistent error response structure', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid', password: 'weak' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: expect.any(String)
      });
    });

    it('should return Content-Type application/json', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(VALID_USER)
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Request Validation (AC-005)', () => {
    const REQUIRED_FIELDS = ['email', 'password'];

    it.each(REQUIRED_FIELDS)('should validate required field: %s', async (field) => {
      const invalidRequest = { ...VALID_USER };
      delete invalidRequest[field as keyof typeof VALID_USER];

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toContain(field);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: VALID_USER.password })
        .expect(400);

      expect(response.body.error).toMatch(/email/i);
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: VALID_USER.email, password: 'weak' })
        .expect(400);

      expect(response.body.error).toMatch(/password/i);
    });

    it('should reject requests with invalid Content-Type', async () => {
      await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400);
    });

    it('should reject requests with malformed JSON', async () => {
      await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });
});