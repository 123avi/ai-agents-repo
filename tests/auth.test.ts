import request from 'supertest';
import app from '../src/app';
import { User } from '../src/models/User';
import { connectDB, disconnectDB, clearDatabase } from './helpers/database';

const VALID_USER_DATA = {
  email: 'test@example.com',
  password: 'SecurePass123!'
};

const INVALID_EMAIL_DATA = {
  email: 'invalid-email',
  password: 'SecurePass123!'
};

const WEAK_PASSWORD_DATA = {
  email: 'test@example.com',
  password: '123'
};

const MISSING_EMAIL_DATA = {
  password: 'SecurePass123!'
};

const MISSING_PASSWORD_DATA = {
  email: 'test@example.com'
};

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/auth/register', () => {
    /**
     * Test successful user registration flow
     * Verifies AC-001: Tests verify successful user registration flow
     */
    it('should successfully register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(VALID_USER_DATA)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Verify user was created in database
      const user = await User.findOne({ email: VALID_USER_DATA.email });
      expect(user).toBeTruthy();
      expect(user?.email).toBe(VALID_USER_DATA.email);
    });

    /**
     * Test duplicate email prevention
     * Verifies AC-004: Tests verify duplicate email prevention
     */
    it('should reject registration with duplicate email', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(VALID_USER_DATA)
        .expect(201);

      // Attempt to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(VALID_USER_DATA)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email already exists');
    });

    /**
     * Test validation error handling for registration
     * Verifies AC-003: Tests verify validation error handling
     */
    describe('validation errors', () => {
      it('should reject invalid email format', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(INVALID_EMAIL_DATA)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('email');
      });

      it('should reject weak password', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(WEAK_PASSWORD_DATA)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('password');
      });

      it('should reject missing email', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(MISSING_EMAIL_DATA)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('email');
      });

      it('should reject missing password', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(MISSING_PASSWORD_DATA)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('password');
      });

      it('should reject empty request body', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(VALID_USER_DATA)
        .expect(201);
    });

    /**
     * Test successful login flow with JWT
     * Verifies AC-002: Tests verify successful login flow with JWT
     */
    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(VALID_USER_DATA)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('userId');
      
      // Verify JWT token format
      const token = response.body.data.token;
      expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      
      // Verify userId format
      expect(response.body.data.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    /**
     * Test invalid credentials handling
     * Verifies AC-005: Tests verify invalid credentials handling
     */
    describe('invalid credentials', () => {
      it('should reject login with wrong password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: VALID_USER_DATA.email,
            password: 'WrongPassword123!'
          })
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('invalid credentials');
      });

      it('should reject login with non-existent email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: VALID_USER_DATA.password
          })
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('invalid credentials');
      });
    });

    /**
     * Test validation error handling for login
     * Verifies AC-003: Tests verify validation error handling
     */
    describe('validation errors', () => {
      it('should reject invalid email format', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send(INVALID_EMAIL_DATA)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('email');
      });

      it('should reject missing email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send(MISSING_EMAIL_DATA)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('email');
      });

      it('should reject missing password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send(MISSING_PASSWORD_DATA)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('password');
      });

      it('should reject empty request body', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });
  });
});