import { Request, Response } from 'express';
import { AuthController } from '../authController';
import { AuthService } from '../../services/AuthService';
import { Logger } from '../../utils/Logger';

// Mock dependencies
jest.mock('../../utils/Logger');

// Mock validation middleware
jest.mock('../../middleware/validation', () => ({
  validateRegisterInput: jest.fn(),
  validateLoginInput: jest.fn()
}));

import { validateRegisterInput, validateLoginInput } from '../../middleware/validation';

const mockValidateRegister = validateRegisterInput as jest.MockedFunction<typeof validateRegisterInput>;
const mockValidateLogin = validateLoginInput as jest.MockedFunction<typeof validateLoginInput>;

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn()
    } as any;

    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    
    mockRequest = {
      body: {}
    };
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    authController = new AuthController(mockAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should return 201 with user ID on successful registration', async () => {
      const userData = { email: 'test@example.com', password: 'password123' };
      const userId = 1;
      
      mockRequest.body = userData;
      mockValidateRegister.mockReturnValue({ isValid: true, errors: [] });
      mockAuthService.register.mockResolvedValue(userId);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.register).toHaveBeenCalledWith(userData.email, userData.password);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({ id: userId });
    });

    it('should return 400 on validation error', async () => {
      const userData = { email: 'invalid-email', password: '123' };
      const validationErrors = ['Invalid email format', 'Password too short'];
      
      mockRequest.body = userData;
      mockValidateRegister.mockReturnValue({ isValid: false, errors: validationErrors });

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: validationErrors.join(', ') });
    });

    it('should return 400 when email already exists', async () => {
      const userData = { email: 'existing@example.com', password: 'password123' };
      
      mockRequest.body = userData;
      mockValidateRegister.mockReturnValue({ isValid: true, errors: [] });
      mockAuthService.register.mockRejectedValue(new Error('Email already exists'));

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Email already exists' });
    });

    it('should return 500 on unexpected error', async () => {
      const userData = { email: 'test@example.com', password: 'password123' };
      
      mockRequest.body = userData;
      mockValidateRegister.mockReturnValue({ isValid: true, errors: [] });
      mockAuthService.register.mockRejectedValue(new Error('Database error'));

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Registration failed' });
    });
  });

  describe('login', () => {
    it('should return 200 with JWT token on successful login', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      const token = 'jwt-token';
      
      mockRequest.body = loginData;
      mockValidateLogin.mockReturnValue({ isValid: true, errors: [] });
      mockAuthService.login.mockResolvedValue(token);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginData.email, loginData.password);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ token });
    });

    it('should return 400 on validation error', async () => {
      const loginData = { email: 'invalid-email', password: '' };
      const validationErrors = ['Invalid email format', 'Password is required'];
      
      mockRequest.body = loginData;
      mockValidateLogin.mockReturnValue({ isValid: false, errors: validationErrors });

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: validationErrors.join(', ') });
    });

    it('should return 401 on invalid credentials', async () => {
      const loginData = { email: 'test@example.com', password: 'wrongpassword' };
      
      mockRequest.body = loginData;
      mockValidateLogin.mockReturnValue({ isValid: true, errors: [] });
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid email or password' });
    });

    it('should return 500 on unexpected error', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      
      mockRequest.body = loginData;
      mockValidateLogin.mockReturnValue({ isValid: true, errors: [] });
      mockAuthService.login.mockRejectedValue(new Error('Database error'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Login failed' });
    });
  });
});