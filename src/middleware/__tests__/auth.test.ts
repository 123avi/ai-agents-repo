import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../auth';

// Mock jwt module
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Mock environment variable
process.env.JWT_SECRET = 'test-secret-key';

describe('authenticateToken middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('AC-001: Extract JWT token from Authorization header', () => {
    it('should extract token from Bearer authorization header', () => {
      mockReq.headers = {
        authorization: 'Bearer valid-token'
      };
      
      mockJwt.verify.mockReturnValue({ userId: 123, iat: 1234567890, exp: 1234571490 });
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key');
    });

    it('should return 401 when authorization header is missing', () => {
      mockReq.headers = {};
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Access token is required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', () => {
      mockReq.headers = {
        authorization: 'Basic some-token'
      };
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Access token is required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('AC-002: Validate token and extract user ID', () => {
    it('should validate token using JWT secret', () => {
      mockReq.headers = {
        authorization: 'Bearer valid-token'
      };
      
      const mockPayload = { userId: 123, iat: 1234567890, exp: 1234571490 };
      mockJwt.verify.mockReturnValue(mockPayload);
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 for invalid token', () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token'
      };
      
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('AC-003: Add user ID to request object', () => {
    it('should add userId to request object for downstream use', () => {
      mockReq.headers = {
        authorization: 'Bearer valid-token'
      };
      
      const mockPayload = { userId: 456, iat: 1234567890, exp: 1234571490 };
      mockJwt.verify.mockReturnValue(mockPayload);
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect((mockReq as any).userId).toBe(456);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('AC-004: Return 401 for missing or invalid tokens', () => {
    it('should return 401 when token is empty', () => {
      mockReq.headers = {
        authorization: 'Bearer '
      };
      
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('jwt must be provided');
      });
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });

    it('should return 401 for malformed token', () => {
      mockReq.headers = {
        authorization: 'Bearer malformed.token'
      };
      
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });
  });

  describe('AC-005: Handle token expiration', () => {
    it('should return 401 for expired token', () => {
      mockReq.headers = {
        authorization: 'Bearer expired-token'
      };
      
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle unexpected errors gracefully', () => {
      mockReq.headers = {
        authorization: 'Bearer some-token'
      };
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Authentication middleware error:', expect.any(Error));
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      
      consoleErrorSpy.mockRestore();
    });
  });
});