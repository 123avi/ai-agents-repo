import { Request, Response, NextFunction } from 'express';
import { validateCreateTodo, validateUpdateTodo } from '../validationMiddleware';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { body: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateCreateTodo', () => {
    it('should pass validation with valid title', () => {
      mockRequest.body = { title: 'Valid title' };

      validateCreateTodo(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should pass validation with title and description', () => {
      mockRequest.body = { title: 'Valid title', description: 'Valid description' };

      validateCreateTodo(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail validation with missing title', () => {
      mockRequest.body = {};

      validateCreateTodo(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Title is required and must be a non-empty string' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail validation with empty title', () => {
      mockRequest.body = { title: '   ' };

      validateCreateTodo(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Title is required and must be a non-empty string' });
    });

    it('should fail validation with title too long', () => {
      mockRequest.body = { title: 'a'.repeat(256) };

      validateCreateTodo(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Title must be 255 characters or less' });
    });

    it('should fail validation with non-string description', () => {
      mockRequest.body = { title: 'Valid title', description: 123 };

      validateCreateTodo(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Description must be a string' });
    });
  });

  describe('validateUpdateTodo', () => {
    it('should pass validation with valid partial update', () => {
      mockRequest.body = { title: 'Updated title' };

      validateUpdateTodo(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass validation with completed flag', () => {
      mockRequest.body = { completed: true };

      validateUpdateTodo(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail validation with invalid completed type', () => {
      mockRequest.body = { completed: 'true' };

      validateUpdateTodo(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Completed must be a boolean' });
    });

    it('should pass validation with empty body', () => {
      mockRequest.body = {};

      validateUpdateTodo(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});