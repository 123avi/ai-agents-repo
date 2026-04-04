import request from 'supertest';
import { Express } from 'express';
import { AuthService } from '../../services/auth.service';
import { createTestApp } from '../../utils/test-helpers';

// Mock the AuthService
jest.mock('../../services/auth.service');
const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;

/**
 * Integration tests for authentication controller endpoints
 * Tests HTTP responses, status codes, and JSON formats for register/login
 */
describe('Auth Controller Integration Tests', () => {
  let app: Express;
  let authServiceInstance: jest.Mocked<AuthService>;

  const VALID_REGISTRATION_DATA = {
    email: 'test@example.com',
    password: 'password123'
  };

  const VALID_LOGIN_DATA = {
    email: 'test@example.com',
    password: 'password123'
  };

  const INVALID_EMAIL_DATA = {
    email: 'invalid-email',
    password: 'password123'
  };

  const MISSING_PASSWORD_DATA = {
    email: 'test@example.com'
  };

  const MOCK_USER_ID = 123;
  const MOCK_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instance
    authServiceInstance = {
      register: jest.fn(),
      login: jest.fn()
    } as jest.Mocked<AuthService>;
    
    // Mock the constructor
    mockAuthService.mockImplementation(() => authServiceInstance);
    
    app = createTestApp();
  });

  describe('POST /auth/register', () => {
    /**
     * AC-001: Test POST /auth/register returns 201 with user ID
     */
    it('should return 201 with user ID for valid registration', async () => {
      authServiceInstance.register.mockResolvedValue({ id: MOCK_USER_ID });

      const response = await request(app)
        .post('/auth/register')
        .send(VALID_REGISTRATION_DATA)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toEqual({ id: MOCK_USER_ID });
      expect(authServiceInstance.register).toHaveBeenCalledWith(
        VALID_REGISTRATION_DATA.email,
        VALID_REGISTRATION_DATA.password
      );
    });

    /**
     * AC-002: Test POST /auth/register returns 400 for invalid data
     */
    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(INVALID_EMAIL_DATA)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(authServiceInstance.register).not.toHaveBeenCalled();
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(MISSING_PASSWORD_DATA)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(authServiceInstance.register).not.toHaveBeenCalled();
    });

    it('should return 400 when service throws validation error', async () => {
      const errorMessage = 'Email already exists';
      authServiceInstance.register.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .post('/auth/register')
        .send(VALID_REGISTRATION_DATA)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: errorMessage });
      expect(authServiceInstance.register).toHaveBeenCalledWith(
        VALID_REGISTRATION_DATA.email,
        VALID_REGISTRATION_DATA.password
      );
    });
  });

  describe('POST /auth/login', () => {
    /**
     * AC-003: Test POST /auth/login returns 200 with JWT token
     */
    it('should return 200 with JWT token for valid credentials', async () => {
      authServiceInstance.login.mockResolvedValue({ token: MOCK_JWT_TOKEN });

      const response = await request(app)
        .post('/auth/login')
        .send(VALID_LOGIN_DATA)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ token: MOCK_JWT_TOKEN });
      expect(authServiceInstance.login).toHaveBeenCalledWith(
        VALID_LOGIN_DATA.email,
        VALID_LOGIN_DATA.password
      );
    });

    /**
     * AC-004: Test POST /auth/login returns 401 for invalid credentials
     */
    it('should return 401 for invalid credentials', async () => {
      const errorMessage = 'Invalid email or password';
      const authError = new Error(errorMessage);
      authError.name = 'AuthenticationError';
      authServiceInstance.login.mockRejectedValue(authError);

      const response = await request(app)
        .post('/auth/login')
        .send(VALID_LOGIN_DATA)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toEqual({ error: errorMessage });
      expect(authServiceInstance.login).toHaveBeenCalledWith(
        VALID_LOGIN_DATA.email,
        VALID_LOGIN_DATA.password
      );
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send(INVALID_EMAIL_DATA)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(authServiceInstance.login).not.toHaveBeenCalled();
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send(MISSING_PASSWORD_DATA)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(authServiceInstance.login).not.toHaveBeenCalled();
    });
  });

  /**
   * AC-005: Test proper JSON response formats
   */
  describe('Response Format Validation', () => {
    it('should always return JSON content-type for register endpoint', async () => {
      authServiceInstance.register.mockResolvedValue({ id: MOCK_USER_ID });

      await request(app)
        .post('/auth/register')
        .send(VALID_REGISTRATION_DATA)
        .expect('Content-Type', /json/);
    });

    it('should always return JSON content-type for login endpoint', async () => {
      authServiceInstance.login.mockResolvedValue({ token: MOCK_JWT_TOKEN });

      await request(app)
        .post('/auth/login')
        .send(VALID_LOGIN_DATA)
        .expect('Content-Type', /json/);
    });

    it('should return JSON error format for malformed request body', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send('invalid-json')
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });
});