import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../../src/middleware/auth.middleware';

// Mock JWT
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const MOCK_JWT_SECRET = 'test-secret';
  const MOCK_USER_ID = '12345';

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    
    // Set test environment variable
    process.env.JWT_SECRET = MOCK_JWT_SECRET;
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('AC-001: Valid token allows request to continue', () => {
    it('should call next() when valid token is provided', () => {
      const validToken = 'valid-jwt-token';
      const decodedPayload = { userId: MOCK_USER_ID };
      
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };
      
      mockJwt.verify.mockReturnValueOnce(decodedPayload);
      
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockJwt.verify).toHaveBeenCalledWith(validToken, MOCK_JWT_SECRET);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle authorization header with different casing', () => {
      const validToken = 'valid-jwt-token';
      const decodedPayload = { userId: MOCK_USER_ID };
      
      mockRequest.headers = {
        Authorization: `Bearer ${validToken}`
      };
      
      mockJwt.verify.mockReturnValueOnce(decodedPayload);
      
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockJwt.verify).toHaveBeenCalledWith(validToken, MOCK_JWT_SECRET);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('AC-002: Missing token returns 401 status', () => {
    it('should return 401 when authorization header is missing', () => {
      mockRequest.headers = {};
      
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is empty', () => {
      mockRequest.headers = {
        authorization: ''
      };
      
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required'
        }
      });
    });

    it('should return 401 when Bearer prefix is missing', () => {
      mockRequest.headers = {
        authorization: 'invalid-format-token'
      };
      
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required'
        }
      });
    });
  });

  describe('AC-003: Invalid token returns 401 status', () => {
    it('should return 401 when JWT verification fails', () => {
      const invalidToken = 'invalid-jwt-token';
      
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`
      };
      
      mockJwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });
      
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token has invalid signature', () => {
      const malformedToken = 'malformed.jwt.token';
      
      mockRequest.headers = {
        authorization: `Bearer ${malformedToken}`
      };
      
      mockJwt.verify.mockImplementationOnce(() => {
        const error = new Error('invalid signature');
        error.name = 'JsonWebTokenError';
        throw error;
      });
      
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      });
    });
  });

  describe('AC-004: Expired token returns 401 status', () => {
    it('should return 401 when token is expired', () => {
      const expiredToken = 'expired-jwt-token';
      
      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`
      };
      
      mockJwt.verify.mockImplementationOnce(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });
      
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('AC-005: Verify user ID is added to request object', () => {
    it('should add userId to request object from token payload', () => {
      const validToken = 'valid-jwt-token';
      const decodedPayload = { userId: MOCK_USER_ID };
      
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };
      
      mockJwt.verify.mockReturnValueOnce(decodedPayload);
      
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.userId).toBe(MOCK_USER_ID);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle token payload with additional properties', () => {
      const validToken = 'valid-jwt-token';
      const decodedPayload = {
        userId: MOCK_USER_ID,
        email: 'test@example.com',
        iat: 1640000000,
        exp: 1640086400
      };
      
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };
      
      mockJwt.verify.mockReturnValueOnce(decodedPayload);
      
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.userId).toBe(MOCK_USER_ID);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return 401 if token payload missing userId', () => {
      const validToken = 'valid-jwt-token';
      const decodedPayload = { email: 'test@example.com' }; // Missing userId
      
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };
      
      mockJwt.verify.mockReturnValueOnce(decodedPayload);
      
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle JWT_SECRET environment variable missing', () => {
      delete process.env.JWT_SECRET;
      
      const validToken = 'valid-jwt-token';
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };
      
      expect(() => {
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow('JWT_SECRET environment variable is required');
    });
  });
});