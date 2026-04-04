import jwt from 'jsonwebtoken';
import { JwtHandler, JwtError } from '../jwt-handler';

// Mock the logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('JwtHandler', () => {
  let jwtHandler: JwtHandler;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-key';
    jwtHandler = new JwtHandler();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should throw error when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      expect(() => new JwtHandler()).toThrow('JWT_SECRET environment variable is required');
    });

    it('should initialize successfully when JWT_SECRET is set', () => {
      expect(() => new JwtHandler()).not.toThrow();
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token with user ID payload', async () => {
      const userId = 123;
      const token = await jwtHandler.generateToken(userId);
      
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
      
      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe(userId);
    });

    it('should generate tokens with 24-hour expiration', async () => {
      const userId = 123;
      const beforeGeneration = Math.floor(Date.now() / 1000);
      const token = await jwtHandler.generateToken(userId);
      const afterGeneration = Math.floor(Date.now() / 1000);
      
      const decoded = jwt.decode(token) as any;
      const expectedMinExpiry = beforeGeneration + (24 * 60 * 60) - 1;
      const expectedMaxExpiry = afterGeneration + (24 * 60 * 60) + 1;
      
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(decoded.exp).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it('should handle generation errors gracefully', async () => {
      const userId = 123;
      const originalSign = jwt.sign;
      jwt.sign = jest.fn().mockImplementation(() => {
        throw new Error('Sign error');
      });
      
      await expect(jwtHandler.generateToken(userId))
        .rejects.toThrow(new JwtError('Token generation failed', 'GENERATION_ERROR'));
      
      jwt.sign = originalSign;
    });
  });

  describe('validateToken', () => {
    it('should validate valid token and extract user ID', async () => {
      const userId = 456;
      const token = await jwtHandler.generateToken(userId);
      
      const extractedUserId = await jwtHandler.validateToken(token);
      expect(extractedUserId).toBe(userId);
    });

    it('should reject tokens with invalid signature', async () => {
      const token = jwt.sign({ userId: 123 }, 'wrong-secret', { algorithm: 'HS256' });
      
      await expect(jwtHandler.validateToken(token))
        .rejects.toThrow(new JwtError('Invalid token', 'INVALID_TOKEN'));
    });

    it('should reject expired tokens', async () => {
      const token = jwt.sign(
        { userId: 123 },
        'test-secret-key',
        { algorithm: 'HS256', expiresIn: '0s' }
      );
      
      // Wait a moment to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await expect(jwtHandler.validateToken(token))
        .rejects.toThrow(new JwtError('Token has expired', 'TOKEN_EXPIRED'));
    });

    it('should reject malformed tokens', async () => {
      const malformedToken = 'not.a.valid.jwt.token';
      
      await expect(jwtHandler.validateToken(malformedToken))
        .rejects.toThrow(new JwtError('Invalid token', 'INVALID_TOKEN'));
    });

    it('should reject tokens with invalid payload', async () => {
      const tokenWithoutUserId = jwt.sign(
        { otherField: 'value' },
        'test-secret-key',
        { algorithm: 'HS256' }
      );
      
      await expect(jwtHandler.validateToken(tokenWithoutUserId))
        .rejects.toThrow(new JwtError('Invalid token payload', 'INVALID_PAYLOAD'));
    });

    it('should reject tokens with non-numeric user ID', async () => {
      const tokenWithStringUserId = jwt.sign(
        { userId: 'not-a-number' },
        'test-secret-key',
        { algorithm: 'HS256' }
      );
      
      await expect(jwtHandler.validateToken(tokenWithStringUserId))
        .rejects.toThrow(new JwtError('Invalid token payload', 'INVALID_PAYLOAD'));
    });

    it('should use HS256 algorithm for validation', async () => {
      const userId = 789;
      const token = await jwtHandler.generateToken(userId);
      
      // Verify the token was created with HS256
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
      expect(header.alg).toBe('HS256');
      
      // Should validate successfully
      const extractedUserId = await jwtHandler.validateToken(token);
      expect(extractedUserId).toBe(userId);
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors during validation', async () => {
      const originalVerify = jwt.verify;
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      await expect(jwtHandler.validateToken('any-token'))
        .rejects.toThrow(new JwtError('Token validation failed', 'VALIDATION_ERROR'));
      
      jwt.verify = originalVerify;
    });
  });
});