import { AuthService } from '../../src/services/auth.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock jwt
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '1h' };
    authService = new AuthService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Password Hashing and Verification', () => {
    describe('hashPassword', () => {
      it('should hash password with 12 salt rounds', async () => {
        const password = 'testPassword123';
        const hashedPassword = 'hashed_password';
        
        mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

        const result = await authService.hashPassword(password);

        expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
        expect(result).toBe(hashedPassword);
      });

      it('should throw error when hashing fails', async () => {
        const password = 'testPassword123';
        
        mockedBcrypt.hash.mockRejectedValue(new Error('Hashing failed'));

        await expect(authService.hashPassword(password)).rejects.toThrow('Hashing failed');
      });
    });

    describe('verifyPassword', () => {
      it('should return true for valid password', async () => {
        const password = 'testPassword123';
        const hashedPassword = 'hashed_password';
        
        mockedBcrypt.compare.mockResolvedValue(true as never);

        const result = await authService.verifyPassword(password, hashedPassword);

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
        expect(result).toBe(true);
      });

      it('should return false for invalid password', async () => {
        const password = 'wrongPassword';
        const hashedPassword = 'hashed_password';
        
        mockedBcrypt.compare.mockResolvedValue(false as never);

        const result = await authService.verifyPassword(password, hashedPassword);

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
        expect(result).toBe(false);
      });

      it('should throw error when comparison fails', async () => {
        const password = 'testPassword123';
        const hashedPassword = 'hashed_password';
        
        mockedBcrypt.compare.mockRejectedValue(new Error('Comparison failed'));

        await expect(authService.verifyPassword(password, hashedPassword)).rejects.toThrow('Comparison failed');
      });
    });
  });

  describe('JWT Token Operations', () => {
    describe('generateToken', () => {
      it('should generate JWT token with user payload', () => {
        const userId = '123';
        const email = 'test@example.com';
        const token = 'generated_token';
        
        mockedJwt.sign.mockReturnValue(token as never);

        const result = authService.generateToken(userId, email);

        expect(jwt.sign).toHaveBeenCalledWith(
          { userId, email },
          'test-secret',
          { expiresIn: '1h' }
        );
        expect(result).toBe(token);
      });

      it('should use default expiration when JWT_EXPIRES_IN not set', () => {
        delete process.env.JWT_EXPIRES_IN;
        authService = new AuthService();
        
        const userId = '123';
        const email = 'test@example.com';
        const token = 'generated_token';
        
        mockedJwt.sign.mockReturnValue(token as never);

        authService.generateToken(userId, email);

        expect(jwt.sign).toHaveBeenCalledWith(
          { userId, email },
          'test-secret',
          { expiresIn: '24h' }
        );
      });

      it('should throw error when JWT_SECRET not set', () => {
        delete process.env.JWT_SECRET;
        
        expect(() => new AuthService()).toThrow('JWT_SECRET environment variable is required');
      });
    });

    describe('validateToken', () => {
      it('should return decoded payload for valid token', () => {
        const token = 'valid_token';
        const decodedPayload = { userId: '123', email: 'test@example.com' };
        
        mockedJwt.verify.mockReturnValue(decodedPayload as never);

        const result = authService.validateToken(token);

        expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
        expect(result).toEqual(decodedPayload);
      });

      it('should throw error for invalid token', () => {
        const token = 'invalid_token';
        
        mockedJwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        expect(() => authService.validateToken(token)).toThrow('Invalid token');
      });

      it('should throw error for expired token', () => {
        const token = 'expired_token';
        const expiredError = new jwt.TokenExpiredError('jwt expired', new Date());
        
        mockedJwt.verify.mockImplementation(() => {
          throw expiredError;
        });

        expect(() => authService.validateToken(token)).toThrow('jwt expired');
      });
    });
  });

  describe('Email Format Validation', () => {
    describe('isValidEmail', () => {
      it('should return true for valid email formats', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'first+last@subdomain.example.org',
          'number123@test.io'
        ];

        validEmails.forEach(email => {
          expect(authService.isValidEmail(email)).toBe(true);
        });
      });

      it('should return false for invalid email formats', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'test@',
          'test..test@example.com',
          'test@example',
          '',
          'test@.com',
          'test@example.'
        ];

        invalidEmails.forEach(email => {
          expect(authService.isValidEmail(email)).toBe(false);
        });
      });

      it('should handle null and undefined inputs', () => {
        expect(authService.isValidEmail(null as any)).toBe(false);
        expect(authService.isValidEmail(undefined as any)).toBe(false);
      });
    });
  });

  describe('Password Strength Validation', () => {
    describe('isValidPassword', () => {
      it('should return true for strong passwords', () => {
        const strongPasswords = [
          'StrongPass123!',
          'MyP@ssw0rd',
          'Secure#Password1',
          'C0mpl3x!Pass'
        ];

        strongPasswords.forEach(password => {
          expect(authService.isValidPassword(password)).toBe(true);
        });
      });

      it('should return false for passwords too short', () => {
        const shortPasswords = [
          'Short1!',
          'P@ss1',
          'Ab1!'
        ];

        shortPasswords.forEach(password => {
          expect(authService.isValidPassword(password)).toBe(false);
        });
      });

      it('should return false for passwords without uppercase letter', () => {
        const passwords = [
          'lowercase123!',
          'noupperca5e@',
          'alllower1#'
        ];

        passwords.forEach(password => {
          expect(authService.isValidPassword(password)).toBe(false);
        });
      });

      it('should return false for passwords without lowercase letter', () => {
        const passwords = [
          'UPPERCASE123!',
          'NOLOWERC@SE5',
          'ALLUPPER1#'
        ];

        passwords.forEach(password => {
          expect(authService.isValidPassword(password)).toBe(false);
        });
      });

      it('should return false for passwords without numbers', () => {
        const passwords = [
          'NoNumbers!@#',
          'OnlyLetters$%^',
          'Password!@#'
        ];

        passwords.forEach(password => {
          expect(authService.isValidPassword(password)).toBe(false);
        });
      });

      it('should return false for passwords without special characters', () => {
        const passwords = [
          'NoSpecialChars123',
          'OnlyAlphaNum456',
          'Password123'
        ];

        passwords.forEach(password => {
          expect(authService.isValidPassword(password)).toBe(false);
        });
      });

      it('should handle null and undefined inputs', () => {
        expect(authService.isValidPassword(null as any)).toBe(false);
        expect(authService.isValidPassword(undefined as any)).toBe(false);
      });
    });
  });

  describe('Token Expiration Handling', () => {
    describe('isTokenExpired', () => {
      it('should return false for non-expired token', () => {
        const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        const token = { exp: futureTime };
        
        const result = authService.isTokenExpired(token);
        
        expect(result).toBe(false);
      });

      it('should return true for expired token', () => {
        const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
        const token = { exp: pastTime };
        
        const result = authService.isTokenExpired(token);
        
        expect(result).toBe(true);
      });

      it('should return true for token without expiration', () => {
        const token = { userId: '123' };
        
        const result = authService.isTokenExpired(token);
        
        expect(result).toBe(true);
      });

      it('should handle edge case of exactly current time', () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const token = { exp: currentTime };
        
        const result = authService.isTokenExpired(token);
        
        expect(result).toBe(true);
      });
    });

    describe('getRemainingTokenTime', () => {
      it('should return remaining seconds for valid token', () => {
        const futureTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now
        const token = { exp: futureTime };
        
        const result = authService.getRemainingTokenTime(token);
        
        expect(result).toBeGreaterThan(1790); // Allow for small timing differences
        expect(result).toBeLessThanOrEqual(1800);
      });

      it('should return 0 for expired token', () => {
        const pastTime = Math.floor(Date.now() / 1000) - 1800; // 30 minutes ago
        const token = { exp: pastTime };
        
        const result = authService.getRemainingTokenTime(token);
        
        expect(result).toBe(0);
      });

      it('should return 0 for token without expiration', () => {
        const token = { userId: '123' };
        
        const result = authService.getRemainingTokenTime(token);
        
        expect(result).toBe(0);
      });
    });
  });
});