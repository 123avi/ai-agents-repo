import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { JwtTokenService } from '../../src/services/jwt-token.service';

// Mock environment variables
const JWT_SECRET = 'test-jwt-secret';
const JWT_EXPIRY = '24h';

vi.mock('../../src/config/environment', () => ({
  JWT_SECRET,
  JWT_EXPIRY
}));

describe('JwtTokenService', () => {
  let tokenService: JwtTokenService;
  const mockUserId = '12345-67890-abcdef';

  beforeEach(() => {
    tokenService = new JwtTokenService();
    vi.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate token with user_id and expiration (AC-001)', () => {
      const token = tokenService.generateToken(mockUserId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Decode token to verify payload
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.user_id).toBe(mockUserId);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should generate different tokens for different users', () => {
      const userId1 = 'user-1';
      const userId2 = 'user-2';
      
      const token1 = tokenService.generateToken(userId1);
      const token2 = tokenService.generateToken(userId2);
      
      expect(token1).not.toBe(token2);
    });

    it('should throw error for invalid user_id', () => {
      expect(() => tokenService.generateToken('')).toThrow();
      expect(() => tokenService.generateToken(null as any)).toThrow();
      expect(() => tokenService.generateToken(undefined as any)).toThrow();
    });
  });

  describe('validateToken', () => {
    it('should extract correct user data from valid token (AC-002)', () => {
      const token = tokenService.generateToken(mockUserId);
      
      const result = tokenService.validateToken(token);
      
      expect(result).toBeDefined();
      expect(result.user_id).toBe(mockUserId);
      expect(result.exp).toBeDefined();
      expect(result.iat).toBeDefined();
    });

    it('should return same user_id for tokens generated with same input', () => {
      const token1 = tokenService.generateToken(mockUserId);
      const token2 = tokenService.generateToken(mockUserId);
      
      const result1 = tokenService.validateToken(token1);
      const result2 = tokenService.validateToken(token2);
      
      expect(result1.user_id).toBe(result2.user_id);
    });
  });

  describe('expired token rejection (AC-003)', () => {
    it('should reject expired token', () => {
      // Create token with very short expiry
      const expiredToken = jwt.sign(
        { user_id: mockUserId },
        JWT_SECRET,
        { expiresIn: '1ms' }
      );
      
      // Wait for token to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(() => tokenService.validateToken(expiredToken))
            .toThrow('Token has expired');
          resolve(undefined);
        }, 10);
      });
    });

    it('should reject token with past exp timestamp', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const expiredToken = jwt.sign(
        { user_id: mockUserId, exp: pastTime },
        JWT_SECRET
      );
      
      expect(() => tokenService.validateToken(expiredToken))
        .toThrow('Token has expired');
    });
  });

  describe('invalid token rejection (AC-004)', () => {
    it('should reject malformed token', () => {
      const malformedToken = 'invalid.token.format';
      
      expect(() => tokenService.validateToken(malformedToken))
        .toThrow('Invalid token format');
    });

    it('should reject token with wrong signature', () => {
      const wrongSecret = 'wrong-secret';
      const tokenWithWrongSignature = jwt.sign(
        { user_id: mockUserId },
        wrongSecret,
        { expiresIn: JWT_EXPIRY }
      );
      
      expect(() => tokenService.validateToken(tokenWithWrongSignature))
        .toThrow('Invalid token signature');
    });

    it('should reject empty or null token', () => {
      expect(() => tokenService.validateToken(''))
        .toThrow('Token is required');
      expect(() => tokenService.validateToken(null as any))
        .toThrow('Token is required');
      expect(() => tokenService.validateToken(undefined as any))
        .toThrow('Token is required');
    });

    it('should reject token without user_id', () => {
      const tokenWithoutUserId = jwt.sign(
        { some_other_field: 'value' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );
      
      expect(() => tokenService.validateToken(tokenWithoutUserId))
        .toThrow('Token missing required user_id');
    });

    it('should reject token with invalid structure', () => {
      const invalidStructureToken = 'header.payload'; // Missing signature
      
      expect(() => tokenService.validateToken(invalidStructureToken))
        .toThrow('Invalid token format');
    });
  });

  describe('edge cases', () => {
    it('should handle token at exact expiry boundary', () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const boundaryToken = jwt.sign(
        { user_id: mockUserId, exp: currentTime + 1 },
        JWT_SECRET
      );
      
      // Should be valid immediately
      const result = tokenService.validateToken(boundaryToken);
      expect(result.user_id).toBe(mockUserId);
    });

    it('should maintain token consistency across multiple validations', () => {
      const token = tokenService.generateToken(mockUserId);
      
      const result1 = tokenService.validateToken(token);
      const result2 = tokenService.validateToken(token);
      
      expect(result1).toEqual(result2);
    });
  });
});