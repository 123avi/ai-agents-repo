import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../auth.service';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret-key'
    };
    authService = new AuthService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateToken', () => {
    it('should generate JWT token with correct expiration (AC-001)', () => {
      const userId = 'test-user-id';
      const expectedToken = 'test.jwt.token';
      const mockPayload = { userId, exp: expect.any(Number) };

      mockedJwt.sign.mockReturnValue(expectedToken);

      const result = authService.generateToken(userId);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        mockPayload,
        'test-secret-key'
      );
      expect(result).toBe(expectedToken);

      // Verify expiration is set to 24 hours
      const signCall = mockedJwt.sign.mock.calls[0];
      const payload = signCall[0] as any;
      const expectedExp = Math.floor(Date.now() / 1000) + 86400; // 24 hours
      expect(payload.exp).toBeCloseTo(expectedExp, -1); // Allow 1 second tolerance
    });

    it('should throw error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      
      expect(() => {
        new AuthService();
      }).toThrow('JWT_SECRET environment variable is required');
    });
  });

  describe('validateToken', () => {
    it('should validate valid token successfully (AC-002)', () => {
      const token = 'valid.jwt.token';
      const expectedPayload = { userId: 'test-user', exp: Math.floor(Date.now() / 1000) + 3600 };

      mockedJwt.verify.mockReturnValue(expectedPayload);

      const result = authService.validateToken(token);

      expect(mockedJwt.verify).toHaveBeenCalledWith(token, 'test-secret-key');
      expect(result).toEqual(expectedPayload);
    });

    it('should reject expired token (AC-002)', () => {
      const expiredToken = 'expired.jwt.token';
      const error = new Error('TokenExpiredError');
      error.name = 'TokenExpiredError';

      mockedJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        authService.validateToken(expiredToken);
      }).toThrow('Token has expired');

      expect(mockedJwt.verify).toHaveBeenCalledWith(expiredToken, 'test-secret-key');
    });

    it('should reject invalid token signature (AC-004)', () => {
      const invalidToken = 'invalid.jwt.token';
      const error = new Error('JsonWebTokenError');
      error.name = 'JsonWebTokenError';

      mockedJwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        authService.validateToken(invalidToken);
      }).toThrow('Invalid token');
    });

    it('should reject malformed token (AC-004)', () => {
      const malformedToken = 'not.a.valid.token.format';
      
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Malformed token');
      });

      expect(() => {
        authService.validateToken(malformedToken);
      }).toThrow('Token validation failed');
    });

    it('should handle empty token (AC-004)', () => {
      expect(() => {
        authService.validateToken('');
      }).toThrow('Token is required');
    });

    it('should handle null token (AC-004)', () => {
      expect(() => {
        authService.validateToken(null as any);
      }).toThrow('Token is required');
    });
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt with correct salt rounds (AC-003)', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashed_password_result';
      const saltRounds = 12;

      mockedBcrypt.hash.mockResolvedValue(hashedPassword);

      const result = await authService.hashPassword(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, saltRounds);
      expect(result).toBe(hashedPassword);
    });

    it('should handle bcrypt hashing errors', async () => {
      const password = 'testPassword123';
      const bcryptError = new Error('Bcrypt hashing failed');

      mockedBcrypt.hash.mockRejectedValue(bcryptError);

      await expect(authService.hashPassword(password))
        .rejects.toThrow('Password hashing failed');
    });

    it('should reject empty password (AC-004)', async () => {
      await expect(authService.hashPassword(''))
        .rejects.toThrow('Password cannot be empty');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password successfully (AC-003)', async () => {
      const plainPassword = 'testPassword123';
      const hashedPassword = 'hashed_password_result';

      mockedBcrypt.compare.mockResolvedValue(true);

      const result = await authService.verifyPassword(plainPassword, hashedPassword);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should reject incorrect password (AC-003)', async () => {
      const plainPassword = 'wrongPassword';
      const hashedPassword = 'hashed_password_result';

      mockedBcrypt.compare.mockResolvedValue(false);

      const result = await authService.verifyPassword(plainPassword, hashedPassword);

      expect(result).toBe(false);
    });

    it('should handle bcrypt comparison errors', async () => {
      const plainPassword = 'testPassword123';
      const hashedPassword = 'hashed_password_result';
      const bcryptError = new Error('Bcrypt comparison failed');

      mockedBcrypt.compare.mockRejectedValue(bcryptError);

      await expect(authService.verifyPassword(plainPassword, hashedPassword))
        .rejects.toThrow('Password verification failed');
    });

    it('should handle empty password verification (AC-004)', async () => {
      const hashedPassword = 'hashed_password_result';

      await expect(authService.verifyPassword('', hashedPassword))
        .rejects.toThrow('Password cannot be empty');
    });

    it('should handle empty hash verification (AC-004)', async () => {
      const plainPassword = 'testPassword123';

      await expect(authService.verifyPassword(plainPassword, ''))
        .rejects.toThrow('Hash cannot be empty');
    });
  });

  describe('Token expiration edge cases', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle token expiration boundary (AC-002)', () => {
      const baseTime = 1000000000000; // Fixed timestamp
      jest.setSystemTime(baseTime);

      const userId = 'test-user';
      mockedJwt.sign.mockReturnValue('test.token');

      authService.generateToken(userId);

      const signCall = mockedJwt.sign.mock.calls[0];
      const payload = signCall[0] as any;
      const expectedExp = Math.floor(baseTime / 1000) + 86400;
      
      expect(payload.exp).toBe(expectedExp);
    });
  });
});