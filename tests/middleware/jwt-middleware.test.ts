import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtMiddleware } from '../../src/middleware/jwt-middleware';

// Mock JWT verification
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    iat?: number;
    exp?: number;
  };
}

describe('JWT Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  const MOCK_JWT_SECRET = 'test-secret';
  const MOCK_USER_PAYLOAD = {
    id: 'user-123',
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
    
    // Set up environment variable
    process.env.JWT_SECRET = MOCK_JWT_SECRET;
    
    jest.clearAllMocks();
  });

  describe('AC-001: Test valid token acceptance', () => {
    it('should accept valid Bearer token and extract user context', () => {
      const validToken = 'valid-jwt-token';
      mockRequest.headers!.authorization = `Bearer ${validToken}`;
      
      mockJwt.verify.mockReturnValueOnce(MOCK_USER_PAYLOAD);
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockJwt.verify).toHaveBeenCalledWith(validToken, MOCK_JWT_SECRET);
      expect(mockRequest.user).toEqual({
        id: MOCK_USER_PAYLOAD.id,
        email: MOCK_USER_PAYLOAD.email,
        iat: MOCK_USER_PAYLOAD.iat,
        exp: MOCK_USER_PAYLOAD.exp
      });
      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should accept valid token with proper format', () => {
      const validToken = 'another-valid-token';
      mockRequest.headers!.authorization = `Bearer ${validToken}`;
      
      const userPayload = {
        id: 'user-456',
        email: 'another@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7200
      };
      
      mockJwt.verify.mockReturnValueOnce(userPayload);
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockJwt.verify).toHaveBeenCalledWith(validToken, MOCK_JWT_SECRET);
      expect(mockRequest.user).toEqual(userPayload);
      expect(nextFunction).toHaveBeenCalledWith();
    });
  });

  describe('AC-002: Test invalid token rejection', () => {
    it('should reject malformed token', () => {
      const invalidToken = 'malformed-token';
      mockRequest.headers!.authorization = `Bearer ${invalidToken}`;
      
      const verifyError = new Error('Invalid token');
      mockJwt.verify.mockImplementationOnce(() => {
        throw verifyError;
      });
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockJwt.verify).toHaveBeenCalledWith(invalidToken, MOCK_JWT_SECRET);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token'
      });
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should reject token with invalid signature', () => {
      const tamperedToken = 'tampered-signature-token';
      mockRequest.headers!.authorization = `Bearer ${tamperedToken}`;
      
      const signatureError = new jwt.JsonWebTokenError('invalid signature');
      mockJwt.verify.mockImplementationOnce(() => {
        throw signatureError;
      });
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('AC-003: Test expired token handling', () => {
    it('should reject expired token', () => {
      const expiredToken = 'expired-jwt-token';
      mockRequest.headers!.authorization = `Bearer ${expiredToken}`;
      
      const expiredError = new jwt.TokenExpiredError('jwt expired', new Date());
      mockJwt.verify.mockImplementationOnce(() => {
        throw expiredError;
      });
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockJwt.verify).toHaveBeenCalledWith(expiredToken, MOCK_JWT_SECRET);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token expired'
      });
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should handle token expiry with specific error message', () => {
      const expiredToken = 'another-expired-token';
      mockRequest.headers!.authorization = `Bearer ${expiredToken}`;
      
      const expiredError = new jwt.TokenExpiredError('jwt expired', new Date('2024-01-01'));
      mockJwt.verify.mockImplementationOnce(() => {
        throw expiredError;
      });
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token expired'
      });
    });
  });

  describe('AC-004: Test missing token scenarios', () => {
    it('should reject request with no authorization header', () => {
      // No authorization header set
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No token provided'
      });
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockJwt.verify).not.toHaveBeenCalled();
    });

    it('should reject request with empty authorization header', () => {
      mockRequest.headers!.authorization = '';
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No token provided'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with malformed authorization header format', () => {
      mockRequest.headers!.authorization = 'InvalidFormat token123';
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token format'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with Bearer but no token', () => {
      mockRequest.headers!.authorization = 'Bearer ';
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No token provided'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('AC-005: Test user context extraction', () => {
    it('should extract complete user context from valid token', () => {
      const token = 'valid-context-token';
      mockRequest.headers!.authorization = `Bearer ${token}`;
      
      const fullUserPayload = {
        id: 'user-789',
        email: 'context@example.com',
        iat: Math.floor(Date.now() / 1000) - 100,
        exp: Math.floor(Date.now() / 1000) + 3600,
        role: 'user' // Extra field to test full extraction
      };
      
      mockJwt.verify.mockReturnValueOnce(fullUserPayload);
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockRequest.user).toEqual(fullUserPayload);
      expect(mockRequest.user!.id).toBe('user-789');
      expect(mockRequest.user!.email).toBe('context@example.com');
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should handle user context with minimal required fields', () => {
      const token = 'minimal-context-token';
      mockRequest.headers!.authorization = `Bearer ${token}`;
      
      const minimalPayload = {
        id: 'user-minimal',
        email: 'minimal@example.com'
      };
      
      mockJwt.verify.mockReturnValueOnce(minimalPayload);
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockRequest.user).toEqual(minimalPayload);
      expect(mockRequest.user!.id).toBe('user-minimal');
      expect(mockRequest.user!.email).toBe('minimal@example.com');
    });

    it('should preserve all token fields in user context', () => {
      const token = 'comprehensive-token';
      mockRequest.headers!.authorization = `Bearer ${token}`;
      
      const comprehensivePayload = {
        id: 'user-comprehensive',
        email: 'comprehensive@example.com',
        iat: 1640995200,
        exp: 1640998800,
        customField: 'customValue'
      };
      
      mockJwt.verify.mockReturnValueOnce(comprehensivePayload);
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockRequest.user).toEqual(comprehensivePayload);
      expect((mockRequest.user as any).customField).toBe('customValue');
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle missing JWT_SECRET environment variable', () => {
      delete process.env.JWT_SECRET;
      
      const token = 'some-token';
      mockRequest.headers!.authorization = `Bearer ${token}`;
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Server configuration error'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle unexpected JWT verification errors', () => {
      const token = 'problematic-token';
      mockRequest.headers!.authorization = `Bearer ${token}`;
      
      const unexpectedError = new Error('Unexpected JWT error');
      mockJwt.verify.mockImplementationOnce(() => {
        throw unexpectedError;
      });
      
      jwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid token'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});