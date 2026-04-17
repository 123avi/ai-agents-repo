import request from 'supertest';
import express from 'express';
import { AuthService } from '../../services/authService';
import { createAuthRoutes } from '../../routes/authRoutes';
import { errorHandler } from '../../middleware/errorHandler';

// Mock the auth service
jest.mock('../../services/authService');
const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn()
  }
}));

describe('Auth Controller Integration Tests', () => {
  let app: express.Application;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    // Create Express app with auth routes and error handling
    app = express();
    app.use(express.json());
    app.use('/auth', createAuthRoutes());
    app.use(errorHandler);

    // Get the mocked service instance
    mockAuthService = MockedAuthService.mock.instances[0] as jest.Mocked<AuthService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should return 201 with user ID on successful registration', async () => {
      const userId = 123;
      mockAuthService.register.mockResolvedValue(userId);

      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(201);

      expect(response.body).toEqual({ id: userId });
      expect(mockAuthService.register).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ password: 'password123' })
        .expect(400);

      expect(response.body).toEqual({ error: 'Email and password are required' });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toEqual({ error: 'Email and password are required' });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should return 400 when user already exists', async () => {
      mockAuthService.register.mockRejectedValue(new Error('User already exists'));

      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(400);

      expect(response.body).toEqual({ error: 'User already exists' });
    });
  });

  describe('POST /auth/login', () => {
    it('should return 200 with JWT token on successful login', async () => {
      const token = 'jwt-token-123';
      mockAuthService.login.mockResolvedValue(token);

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(response.body).toEqual({ token });
      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ password: 'password123' })
        .expect(400);

      expect(response.body).toEqual({ error: 'Email and password are required' });
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toEqual({ error: 'Email and password are required' });
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);

      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });
  });

  describe('Route Existence Verification', () => {
    it('should have register route configured', async () => {
      mockAuthService.register.mockResolvedValue(123);
      
      await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(201);
    });

    it('should have login route configured', async () => {
      mockAuthService.login.mockResolvedValue('token');
      
      await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);
    });
  });

  describe('JSON Response Format Verification', () => {
    it('should return proper JSON format for successful registration', async () => {
      mockAuthService.register.mockResolvedValue(456);

      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(typeof response.body).toBe('object');
      expect(response.body).toHaveProperty('id');
      expect(typeof response.body.id).toBe('number');
    });

    it('should return proper JSON format for successful login', async () => {
      mockAuthService.login.mockResolvedValue('jwt-token');

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(typeof response.body).toBe('object');
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
    });

    it('should return proper JSON format for errors', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(typeof response.body).toBe('object');
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });
});