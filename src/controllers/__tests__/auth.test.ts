import request from 'supertest';
import { createTestApp } from '../../utils/test-helpers';
import * as AuthService from '../../services/auth';

// Mock the auth service
jest.mock('../../services/auth');
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('Auth Controller', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should return 201 with user ID on successful registration', async () => {
      // AC-001: Test POST /auth/register returns 201 with user ID
      const mockUser = { id: 123 };
      mockAuthService.register = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: 123 });
      expect(mockAuthService.register).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });

    it('should return 400 for invalid registration data', async () => {
      // AC-002: Test POST /auth/register returns 400 for invalid data
      const error = new Error('Email already exists');
      mockAuthService.register = jest.fn().mockRejectedValue(error);

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid@example.com',
          password: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should return 400 for missing required fields', async () => {
      // AC-002: Test POST /auth/register returns 400 for invalid data
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com'
          // missing password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/login', () => {
    it('should return 200 with JWT token on successful login', async () => {
      // AC-003: Test POST /auth/login returns 200 with JWT token
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      mockAuthService.login = jest.fn().mockResolvedValue({ token: mockToken });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ token: mockToken });
      expect(mockAuthService.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });

    it('should return 401 for invalid credentials', async () => {
      // AC-004: Test POST /auth/login returns 401 for invalid credentials
      const error = new Error('Invalid credentials');
      mockAuthService.login = jest.fn().mockRejectedValue(error);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com'
          // missing password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response Format Validation', () => {
    it('should return proper JSON response format for registration', async () => {
      // AC-005: Test proper JSON response formats
      const mockUser = { id: 456 };
      mockAuthService.register = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'format@example.com',
          password: 'password123'
        });

      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('id');
      expect(typeof response.body.id).toBe('number');
    });

    it('should return proper JSON response format for login', async () => {
      // AC-005: Test proper JSON response formats
      const mockToken = 'test.jwt.token';
      mockAuthService.login = jest.fn().mockResolvedValue({ token: mockToken });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'format@example.com',
          password: 'password123'
        });

      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
    });
  });

  describe('Route Registration Validation', () => {
    it('should have auth routes registered in the app', () => {
      // Smoke test to verify routes are actually registered
      const routes = app._router?.stack || [];
      const authRoute = routes.find((layer: any) => 
        layer.regexp && layer.regexp.toString().includes('auth')
      );
      
      expect(authRoute).toBeDefined();
    });
  });
});