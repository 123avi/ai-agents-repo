import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../authController';
import { AuthService } from '../../services/authService';
import { ValidationError } from '../../errors/ValidationError';
import { AuthenticationError } from '../../errors/AuthenticationError';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../utils/logger');

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn()
} as jest.Mocked<AuthService>;

const mockRequest = {
  body: {}
} as Request;

const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
} as jest.Mocked<Response>;

const mockNext = jest.fn() as NextFunction;

describe('AuthController', () => {
  let authController: AuthController;

  beforeEach(() => {
    authController = new AuthController(mockAuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should return 201 with user ID on successful registration', async () => {
      const userId = 123;
      mockRequest.body = { email: 'test@example.com', password: 'password123' };
      mockAuthService.register.mockResolvedValue(userId);

      await authController.register(mockRequest, mockResponse, mockNext);

      expect(mockAuthService.register).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ id: userId });
      expect(logger.info).toHaveBeenCalledWith(`User registered successfully with ID: ${userId}`);
    });

    it('should return 400 on validation error', async () => {
      const validationError = new ValidationError('Invalid email format');
      mockRequest.body = { email: 'invalid-email', password: 'password123' };
      mockAuthService.register.mockRejectedValue(validationError);

      await authController.register(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid email format' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on unexpected error', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockRequest.body = { email: 'test@example.com', password: 'password123' };
      mockAuthService.register.mockRejectedValue(unexpectedError);

      await authController.register(mockRequest, mockResponse, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Registration error:', unexpectedError);
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });
  });

  describe('login', () => {
    it('should return 200 with JWT token on successful login', async () => {
      const token = 'jwt-token-123';
      mockRequest.body = { email: 'test@example.com', password: 'password123' };
      mockAuthService.login.mockResolvedValue(token);

      await authController.login(mockRequest, mockResponse, mockNext);

      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ token });
      expect(logger.info).toHaveBeenCalledWith('User logged in successfully: test@example.com');
    });

    it('should return 400 on validation error', async () => {
      const validationError = new ValidationError('Password is required');
      mockRequest.body = { email: 'test@example.com', password: '' };
      mockAuthService.login.mockRejectedValue(validationError);

      await authController.login(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Password is required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 on authentication error', async () => {
      const authError = new AuthenticationError('Invalid credentials');
      mockRequest.body = { email: 'test@example.com', password: 'wrong-password' };
      mockAuthService.login.mockRejectedValue(authError);

      await authController.login(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on unexpected error', async () => {
      const unexpectedError = new Error('Service unavailable');
      mockRequest.body = { email: 'test@example.com', password: 'password123' };
      mockAuthService.login.mockRejectedValue(unexpectedError);

      await authController.login(mockRequest, mockResponse, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Login error:', unexpectedError);
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });
  });
});
