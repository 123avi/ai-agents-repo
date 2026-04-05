const request = require('supertest');
const express = require('express');
const errorHandler = require('../../src/middleware/errorHandler');
const logger = require('../../src/utils/logger');

// Mock logger to capture log calls
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn()
}));

describe('Error Handler Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    app = null;
  });

  describe('AC-001: Test standardized error response format', () => {
    it('should return standardized error format for validation errors', async () => {
      app.get('/test-validation', (req, res, next) => {
        const error = new Error('Invalid input data');
        error.name = 'ValidationError';
        error.statusCode = 400;
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-validation')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data'
        }
      });
    });

    it('should return standardized format for internal server errors', async () => {
      app.get('/test-internal', (req, res, next) => {
        const error = new Error('Database connection failed');
        error.statusCode = 500;
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-internal')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('data', null);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('AC-002: Test different error types return appropriate status codes', () => {
    const errorTestCases = [
      { name: 'ValidationError', statusCode: 400, expectedCode: 'VALIDATION_ERROR' },
      { name: 'UnauthorizedError', statusCode: 401, expectedCode: 'UNAUTHORIZED_ERROR' },
      { name: 'ForbiddenError', statusCode: 403, expectedCode: 'FORBIDDEN_ERROR' },
      { name: 'NotFoundError', statusCode: 404, expectedCode: 'NOT_FOUND_ERROR' },
      { name: 'ConflictError', statusCode: 409, expectedCode: 'CONFLICT_ERROR' },
      { name: 'TokenExpiredError', statusCode: 401, expectedCode: 'TOKEN_EXPIRED_ERROR' }
    ];

    errorTestCases.forEach(({ name, statusCode, expectedCode }) => {
      it(`should return ${statusCode} status for ${name}`, async () => {
        app.get('/test-error', (req, res, next) => {
          const error = new Error('Test error');
          error.name = name;
          error.statusCode = statusCode;
          next(error);
        });
        app.use(errorHandler);

        const response = await request(app)
          .get('/test-error')
          .expect(statusCode);

        expect(response.body.error.code).toBe(expectedCode);
      });
    });

    it('should default to 500 for unknown error types', async () => {
      app.get('/test-unknown', (req, res, next) => {
        const error = new Error('Unknown error');
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-unknown')
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('AC-003: Test error logging functionality', () => {
    it('should log errors with appropriate level for client errors', async () => {
      app.get('/test-client-error', (req, res, next) => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        error.statusCode = 400;
        next(error);
      });
      app.use(errorHandler);

      await request(app)
        .get('/test-client-error')
        .expect(400);

      expect(logger.info).toHaveBeenCalledWith(
        'Client error: Validation failed',
        expect.objectContaining({
          error: 'Validation failed',
          statusCode: 400,
          method: 'GET',
          url: '/test-client-error'
        })
      );
    });

    it('should log errors with appropriate level for server errors', async () => {
      app.get('/test-server-error', (req, res, next) => {
        const error = new Error('Database connection failed');
        error.statusCode = 500;
        next(error);
      });
      app.use(errorHandler);

      await request(app)
        .get('/test-server-error')
        .expect(500);

      expect(logger.error).toHaveBeenCalledWith(
        'Server error: Database connection failed',
        expect.objectContaining({
          error: 'Database connection failed',
          statusCode: 500,
          method: 'GET',
          url: '/test-server-error',
          stack: expect.any(String)
        })
      );
    });

    it('should include request context in error logs', async () => {
      app.post('/test-context', (req, res, next) => {
        const error = new Error('Test error with context');
        error.statusCode = 500;
        next(error);
      });
      app.use(errorHandler);

      await request(app)
        .post('/test-context')
        .send({ test: 'data' })
        .expect(500);

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          url: '/test-context',
          userAgent: expect.any(String)
        })
      );
    });
  });

  describe('AC-004: Test error message sanitization', () => {
    it('should sanitize sensitive information from error messages in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/test-sensitive', (req, res, next) => {
        const error = new Error('Database password abc123 connection failed');
        error.statusCode = 500;
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-sensitive')
        .expect(500);

      expect(response.body.error.message).toBe('Internal server error');
      expect(response.body.error.message).not.toContain('abc123');
      expect(response.body.error.message).not.toContain('Database');

      process.env.NODE_ENV = originalEnv;
    });

    it('should preserve error messages in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app.get('/test-dev-message', (req, res, next) => {
        const error = new Error('Detailed error for debugging');
        error.statusCode = 500;
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-dev-message')
        .expect(500);

      expect(response.body.error.message).toBe('Detailed error for debugging');

      process.env.NODE_ENV = originalEnv;
    });

    it('should always preserve client error messages', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/test-client-message', (req, res, next) => {
        const error = new Error('Email address is required');
        error.name = 'ValidationError';
        error.statusCode = 400;
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-client-message')
        .expect(400);

      expect(response.body.error.message).toBe('Email address is required');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('AC-005: Test unhandled errors are caught', () => {
    it('should catch synchronous errors thrown in routes', async () => {
      app.get('/test-sync-error', (req, res, next) => {
        throw new Error('Synchronous error');
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-sync-error')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should catch errors from async operations', async () => {
      app.get('/test-async-error', async (req, res, next) => {
        try {
          await new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Async operation failed')), 10);
          });
        } catch (error) {
          next(error);
        }
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-async-error')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Async operation failed');
    });

    it('should handle malformed JSON errors', async () => {
      app.post('/test-json', (req, res) => {
        res.json({ received: req.body });
      });
      app.use(errorHandler);

      const response = await request(app)
        .post('/test-json')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle errors without status codes', async () => {
      app.get('/test-no-status', (req, res, next) => {
        const error = new Error('Error without status code');
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-no-status')
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error objects passed to next()', async () => {
      app.get('/test-non-error', (req, res, next) => {
        next('String error');
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-non-error')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Response headers and format consistency', () => {
    it('should set appropriate response headers', async () => {
      app.get('/test-headers', (req, res, next) => {
        const error = new Error('Test error');
        error.statusCode = 400;
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-headers')
        .expect(400);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should not expose internal error details in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/test-stack-trace', (req, res, next) => {
        const error = new Error('Internal error');
        error.statusCode = 500;
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test-stack-trace')
        .expect(500);

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body.error.message).toBe('Internal server error');

      process.env.NODE_ENV = originalEnv;
    });
  });
});