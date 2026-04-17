import { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler } from '../../middleware/errorHandler.js';
import { HTTP_STATUS } from '../../constants/server.js';

// Mock Express objects
const mockRequest = {
  url: '/test',
  method: 'GET',
} as Request;

const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
} as unknown as Response;

const mockNext = jest.fn() as NextFunction;

describe('Error Handling Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AppError', () => {
    it('should create AppError with message and status code', () => {
      const error = new AppError('Test error', HTTP_STATUS.BAD_REQUEST);
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.isOperational).toBe(true);
    });

    it('should default to 500 status code when not provided', () => {
      const error = new AppError('Test error');
      
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test error');
      
      expect(error.stack).toBeDefined();
    });
  });

  describe('errorHandler middleware', () => {
    it('should handle AppError with custom status and message', () => {
      const appError = new AppError('Custom error message', HTTP_STATUS.BAD_REQUEST);
      
      errorHandler(appError, mockRequest, mockResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Custom error message',
      });
    });

    it('should handle generic Error with 500 status', () => {
      const genericError = new Error('Generic error');
      
      errorHandler(genericError, mockRequest, mockResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });

    it('should log error details', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const testError = new Error('Test error');
      
      errorHandler(testError, mockRequest, mockResponse, mockNext);
      
      expect(consoleSpy).toHaveBeenCalledWith('Error occurred:', expect.objectContaining({
        message: 'Test error',
        stack: expect.any(String),
        url: '/test',
        method: 'GET',
        timestamp: expect.any(String),
      }));
    });

    it('should handle errors in error handler gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      // Mock response.status to throw an error
      mockResponse.status = jest.fn().mockImplementation(() => {
        throw new Error('Response error');
      });
      
      const testError = new Error('Original error');
      
      errorHandler(testError, mockRequest, mockResponse, mockNext);
      
      expect(consoleSpy).toHaveBeenCalledWith('Error in error handler:', expect.any(Error));
    });
  });
});