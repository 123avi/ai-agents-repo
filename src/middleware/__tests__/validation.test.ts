import { Request, Response } from 'express';
import {
  validateRequest,
  registerSchema,
  loginSchema,
  createTodoSchema,
  updateTodoSchema
} from '../validation';

// Mock Express objects
const mockRequest = (body: any): Partial<Request> => ({ body });
const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res;
};
const mockNext = jest.fn();

describe('Validation Schemas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      };
      const { error } = registerSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123'
      };
      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid email address');
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'short'
      };
      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('at least 8 characters');
    });

    it('should reject missing email', () => {
      const invalidData = { password: 'password123' };
      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Email is required');
    });

    it('should reject missing password', () => {
      const invalidData = { email: 'test@example.com' };
      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Password is required');
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'anypassword'
      };
      const { error } = loginSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password'
      };
      const { error } = loginSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('valid email address');
    });
  });

  describe('createTodoSchema', () => {
    it('should validate valid todo creation data', () => {
      const validData = { title: 'Test todo' };
      const { error } = createTodoSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should validate todo with valid status', () => {
      const validData = {
        title: 'Test todo',
        status: 'open'
      };
      const { error } = createTodoSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing title', () => {
      const invalidData = { status: 'open' };
      const { error } = createTodoSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Title is required');
    });

    it('should reject invalid status', () => {
      const invalidData = {
        title: 'Test todo',
        status: 'invalid'
      };
      const { error } = createTodoSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Status must be one of: open, done');
    });
  });

  describe('updateTodoSchema', () => {
    it('should validate valid update data', () => {
      const validData = { title: 'Updated title' };
      const { error } = updateTodoSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should validate status update', () => {
      const validData = { status: 'done' };
      const { error } = updateTodoSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject empty update object', () => {
      const invalidData = {};
      const { error } = updateTodoSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('At least one field must be provided');
    });

    it('should reject invalid status', () => {
      const invalidData = { status: 'invalid' };
      const { error } = updateTodoSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toContain('Status must be one of: open, done');
    });
  });
});

describe('validateRequest middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() for valid data', () => {
    const middleware = validateRequest(registerSchema);
    const req = mockRequest({
      email: 'test@example.com',
      password: 'password123'
    }) as Request;
    const res = mockResponse() as Response;

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 status for validation errors', () => {
    const middleware = validateRequest(registerSchema);
    const req = mockRequest({
      email: 'invalid-email',
      password: 'short'
    }) as Request;
    const res = mockResponse() as Response;

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(String),
        details: expect.any(Array)
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should strip unknown fields from request body', () => {
    const middleware = validateRequest(registerSchema);
    const req = mockRequest({
      email: 'test@example.com',
      password: 'password123',
      unknownField: 'should be stripped'
    }) as Request;
    const res = mockResponse() as Response;

    middleware(req, res, mockNext);

    expect(req.body).not.toHaveProperty('unknownField');
    expect(req.body).toEqual({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('should handle internal errors gracefully', () => {
    const faultySchema = {
      validate: () => {
        throw new Error('Schema error');
      }
    } as any;
    
    const middleware = validateRequest(faultySchema);
    const req = mockRequest({}) as Request;
    const res = mockResponse() as Response;

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error during validation'
    });
  });
});