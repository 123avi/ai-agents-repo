import request from 'supertest';
import express from 'express';
import { AuthController } from '../auth.controller';
import { AuthService } from '../../services/auth.service';
import { createAuthRoutes } from '../../routes/auth.routes';
import { UserRepository } from '../../repositories/user.repository';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock AuthService
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn()
};

// Mock UserRepository
const mockUserRepository = {
  findByEmail: jest.fn(),
  create: jest.fn()
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    controller = new AuthController(mockAuthService as any);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should return 400 when email is missing', async () => {
      const req = { body: { password: 'test123' } } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await controller.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Valid email and password are required'
      });
    });

    it('should return 400 when password is missing', async () => {
      const req = { body: { email: 'test@example.com' } } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await controller.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Valid email and password are required'
      });
    });

    it('should return 201 with user ID on successful registration', async () => {
      mockAuthService.register.mockResolvedValue('123');
      
      const req = {
        body: { email: 'test@example.com', password: 'test123' }
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await controller.register(req, res);

      expect(mockAuthService.register).toHaveBeenCalledWith('test@example.com', 'test123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: '123' });
    });

    it('should return 400 when user already exists', async () => {
      mockAuthService.register.mockRejectedValue(new Error('User with this email already exists'));
      
      const req = {
        body: { email: 'test@example.com', password: 'test123' }
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await controller.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' });
    });
  });

  describe('login', () => {
    it('should return 400 when credentials are invalid format', async () => {
      const req = { body: { email: '', password: 'test123' } } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await controller.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Valid email and password are required'
      });
    });

    it('should return 200 with token on successful login', async () => {
      mockAuthService.login.mockResolvedValue('jwt-token-123');
      
      const req = {
        body: { email: 'test@example.com', password: 'test123' }
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await controller.login(req, res);

      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'test123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ token: 'jwt-token-123' });
    });

    it('should return 401 when credentials are invalid', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));
      
      const req = {
        body: { email: 'test@example.com', password: 'wrong' }
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await controller.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
    });
  });
});

describe('Auth Routes Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', createAuthRoutes(mockUserRepository as any));
    jest.clearAllMocks();
  });

  it('should handle POST /auth/register with full request/response cycle', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue(123);

    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'integration@test.com', password: 'test123' })
      .expect(201);

    expect(response.body).toEqual({ id: '123' });
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('integration@test.com');
    expect(mockUserRepository.create).toHaveBeenCalled();
  });

  it('should handle POST /auth/login with full request/response cycle', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: 123,
      email: 'integration@test.com',
      password: '$2b$10$hashedpassword'
    });
    
    // Mock bcrypt.compare to return true
    jest.doMock('bcrypt', () => ({
      hash: jest.fn(),
      compare: jest.fn().mockResolvedValue(true)
    }));

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'integration@test.com', password: 'test123' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
  });

  it('should return 400 for invalid registration data in integration test', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: '', password: 'test123' })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Valid email and password are required'
    });
  });

  it('should return 400 for missing login data in integration test', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com' })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Valid email and password are required'
    });
  });
});