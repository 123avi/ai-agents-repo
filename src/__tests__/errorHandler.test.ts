import { Request, Response, NextFunction } from 'express';
import { errorHandler, ApiError } from '../middleware/errorHandler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      path: '/test',
      method: 'GET'
    };
    
    mockResponse = {
      status: statusMock
    };
    
    mockNext = jest.fn();
    
    // Mock console.error to avoid test output noise
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ApiError handling', () => {
    it('should handle ApiError with custom status code', () => {
      const error = new ApiError('Custom error', 400);
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Custom error',
        timestamp: expect.any(String)
      });
    });

    it('should handle ApiError with default status code', () => {
      const error = new ApiError('Default error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('Validation error handling', () => {
    it('should handle validation errors', () => {
      const error = new Error('Field is required');
      error.name = 'ValidationError';
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: 'Field is required',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Generic error handling', () => {
    it('should handle unknown errors with 500 status', () => {
      const error = new Error('Unknown error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Internal server error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error logging', () => {
    it('should log error details', () => {
      const error = new Error('Test error');
      const consoleSpy = jest.spyOn(console, 'error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(consoleSpy).toHaveBeenCalledWith('Error occurred:', {
        message: 'Test error',
        stack: expect.any(String),
        path: '/test',
        method: 'GET',
        timestamp: expect.any(String)
      });
    });
  });
});

describe('ApiError Class', () => {
  it('should create ApiError with default values', () => {
    const error = new ApiError('Test message');
    
    expect(error.message).toBe('Test message');
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });

  it('should create ApiError with custom values', () => {
    const error = new ApiError('Custom message', 404, false);
    
    expect(error.message).toBe('Custom message');
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(false);
  });
});