import request from 'supertest';
import express from 'express';
import { createAuthRoutes } from '../authRoutes';
import { authService } from '../../services/authService';
import { validateRegistration, validateLogin } from '../../middleware/validation';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../middleware/validation');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockValidateRegistration = validateRegistration as jest.MockedFunction<typeof validateRegistration>;
const mockValidateLogin = validateLogin as jest.MockedFunction<typeof validateLogin>;

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock middleware to pass through
    mockValidateRegistration.mockImplementation((req, res, next) => next());
    mockValidateLogin.mockImplementation((req, res, next) => next());
    
    app.use('/auth', createAuthRoutes());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should use validation middleware', async () => {
      mockAuthService.register = jest.fn().mockResolvedValue(1);
      
      await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(mockValidateRegistration).toHaveBeenCalled();
    });
  });

  describe('POST /auth/login', () => {
    it('should use validation middleware', async () => {
      mockAuthService.login = jest.fn().mockResolvedValue('token');
      
      await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(mockValidateLogin).toHaveBeenCalled();
    });
  });
});
