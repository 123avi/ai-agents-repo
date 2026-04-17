import { JwtHandler, UserTokenPayload, VerifiedTokenPayload } from '../jwt-handler';
import jwt from 'jsonwebtoken';

describe('JwtHandler', () => {
  const TEST_SECRET = 'test-jwt-secret-key-for-testing-only';
  const INVALID_SECRET = 'wrong-secret';
  let jwtHandler: JwtHandler;
  let mockDate: jest.SpyInstance;

  const mockUserPayload: UserTokenPayload = {
    userId: 123,
    email: 'test@example.com'
  };

  beforeEach(() => {
    jwtHandler = new JwtHandler(TEST_SECRET);
    // Mock Date.now() for consistent time-based testing
    mockDate = jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01 00:00:00 UTC
  });

  afterEach(() => {
    mockDate.mockRestore();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when secret is empty', () => {
      expect(() => new JwtHandler('')).toThrow('JWT secret is required');
    });

    it('should throw error when secret is null', () => {
      expect(() => new JwtHandler(null as any)).toThrow('JWT secret is required');
    });

    it('should create instance with valid secret', () => {
      const handler = new JwtHandler(TEST_SECRET);
      expect(handler).toBeInstanceOf(JwtHandler);
    });
  });

  describe('generateToken (AC-001)', () => {
    it('should generate token with user payload', () => {
      const token = jwtHandler.generateToken(mockUserPayload);
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
      
      // Verify payload can be decoded
      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe(mockUserPayload.userId);
      expect(decoded.email).toBe(mockUserPayload.email);
      expect(decoded.exp).toBeDefined();
    });

    it('should include expiration time in token', () => {
      const token = jwtHandler.generateToken(mockUserPayload);
      const decoded = jwt.decode(token) as any;
      
      // Token should expire in 24 hours (86400 seconds)
      const expectedExpiry = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
      expect(decoded.exp).toBe(expectedExpiry);
    });

    it('should throw error when jwt.sign fails', () => {
      const invalidHandler = new JwtHandler(TEST_SECRET);
      jest.spyOn(jwt, 'sign').mockImplementation(() => {
        throw new Error('Signing failed');
      });

      expect(() => invalidHandler.generateToken(mockUserPayload))
        .toThrow('Token generation failed: Signing failed');
    });
  });

  describe('validateToken (AC-002, AC-003)', () => {
    it('should validate and return payload for valid token', () => {
      const token = jwtHandler.generateToken(mockUserPayload);
      const result = jwtHandler.validateToken(token);
      
      expect(result.userId).toBe(mockUserPayload.userId);
      expect(result.email).toBe(mockUserPayload.email);
      expect(result.iat).toBeDefined();
      expect(result.exp).toBeDefined();
    });

    it('should reject token signed with wrong secret', () => {
      const wrongSecretHandler = new JwtHandler(INVALID_SECRET);
      const token = jwtHandler.generateToken(mockUserPayload);
      
      expect(() => wrongSecretHandler.validateToken(token))
        .toThrow('Invalid token format');
    });

    it('should reject malformed token (AC-005)', () => {
      const malformedToken = 'not.a.valid.jwt.token';
      
      expect(() => jwtHandler.validateToken(malformedToken))
        .toThrow('Invalid token format');
    });

    it('should reject empty token (AC-005)', () => {
      expect(() => jwtHandler.validateToken(''))
        .toThrow('Invalid token format');
    });

    it('should reject token with invalid structure (AC-005)', () => {
      const invalidToken = 'header.payload'; // Missing signature
      
      expect(() => jwtHandler.validateToken(invalidToken))
        .toThrow('Invalid token format');
    });

    it('should handle generic verification errors', () => {
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        const error = new Error('Unexpected error');
        error.name = 'UnknownError';
        throw error;
      });

      const token = 'valid.jwt.token';
      expect(() => jwtHandler.validateToken(token))
        .toThrow('Token validation failed: Unexpected error');
    });
  });

  describe('token expiration (AC-004)', () => {
    it('should reject expired token after 24 hours', () => {
      // Generate token at current time
      const token = jwtHandler.generateToken(mockUserPayload);
      
      // Fast-forward time by 24 hours + 1 second
      const futureTime = 1640995200000 + (24 * 60 * 60 * 1000) + 1000;
      mockDate.mockReturnValue(futureTime);
      
      expect(() => jwtHandler.validateToken(token))
        .toThrow('Token has expired');
    });

    it('should accept token just before 24 hour expiration', () => {
      const token = jwtHandler.generateToken(mockUserPayload);
      
      // Fast-forward time by 24 hours - 1 second
      const almostExpiredTime = 1640995200000 + (24 * 60 * 60 * 1000) - 1000;
      mockDate.mockReturnValue(almostExpiredTime);
      
      expect(() => jwtHandler.validateToken(token)).not.toThrow();
    });

    it('should handle TokenExpiredError specifically', () => {
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const expiredToken = 'expired.jwt.token';
      expect(() => jwtHandler.validateToken(expiredToken))
        .toThrow('Token has expired');
    });
  });

  describe('extractUserId', () => {
    it('should extract user ID from valid token', () => {
      const token = jwtHandler.generateToken(mockUserPayload);
      const userId = jwtHandler.extractUserId(token);
      
      expect(userId).toBe(mockUserPayload.userId);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token';
      
      expect(() => jwtHandler.extractUserId(invalidToken))
        .toThrow('Invalid token format');
    });

    it('should throw error for expired token', () => {
      const token = jwtHandler.generateToken(mockUserPayload);
      
      // Fast-forward time to expire token
      const futureTime = 1640995200000 + (25 * 60 * 60 * 1000);
      mockDate.mockReturnValue(futureTime);
      
      expect(() => jwtHandler.extractUserId(token))
        .toThrow('Token has expired');
    });
  });
});