import { AuthService } from '../AuthService';
import { UserRepository } from '../../repositories/UserRepository';
import { HashService } from '../../utils/HashService';
import { Logger } from '../../utils/Logger';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../utils/Logger');
jest.mock('jsonwebtoken');

const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockHashService: jest.Mocked<HashService>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret' };

    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn()
    } as any;

    mockHashService = {
      hash: jest.fn(),
      compare: jest.fn()
    };

    authService = new AuthService(mockUserRepository, mockHashService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if JWT_SECRET is missing in production', () => {
      process.env = { ...originalEnv, NODE_ENV: 'production' };
      delete process.env.JWT_SECRET;

      expect(() => {
        new AuthService(mockUserRepository, mockHashService);
      }).toThrow('JWT_SECRET environment variable is required in production');
    });

    it('should use default secret in development when JWT_SECRET is missing', () => {
      process.env = { ...originalEnv, NODE_ENV: 'development' };
      delete process.env.JWT_SECRET;

      expect(() => {
        new AuthService(mockUserRepository, mockHashService);
      }).not.toThrow();
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = 'hashed-password';
      const userId = 1;

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockHashService.hash.mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockResolvedValue(userId);

      const result = await authService.register(email, password);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockHashService.hash).toHaveBeenCalledWith(password, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith(email, hashedPassword);
      expect(result).toBe(userId);
    });

    it('should throw error when email already exists', async () => {
      const email = 'existing@example.com';
      const password = 'password123';
      const existingUser = { id: 1, email, passwordHash: 'hash' };

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(authService.register(email, password)).rejects.toThrow('Email already exists');
      expect(mockHashService.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const user = { id: 1, email, passwordHash: 'hashed-password' };
      const token = 'jwt-token';

      mockUserRepository.findByEmail.mockResolvedValue(user);
      mockHashService.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue(token);

      const result = await authService.login(email, password);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockHashService.compare).toHaveBeenCalledWith(password, user.passwordHash);
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId: user.id, email },
        'test-secret',
        { expiresIn: '24h' }
      );
      expect(result).toBe(token);
    });

    it('should throw error when user does not exist', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(email, password)).rejects.toThrow('Invalid credentials');
      expect(mockHashService.compare).not.toHaveBeenCalled();
      expect(mockJwt.sign).not.toHaveBeenCalled();
    });

    it('should throw error when password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const user = { id: 1, email, passwordHash: 'hashed-password' };

      mockUserRepository.findByEmail.mockResolvedValue(user);
      mockHashService.compare.mockResolvedValue(false);

      await expect(authService.login(email, password)).rejects.toThrow('Invalid credentials');
      expect(mockJwt.sign).not.toHaveBeenCalled();
    });
  });
});