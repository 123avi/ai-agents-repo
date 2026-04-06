import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../middleware/errorHandler';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

// Mock logger to verify logging calls
jest.mock('../../utils/logger');
const mockLogger = logger as jest.Mocked<typeof logger>;

const ERROR_MESSAGES = {
  GENERIC: 'Internal server error',
  VALIDATION: 'Validation failed',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Authentication required'
} as const;

const STATUS_CODES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  INTERNAL_SERVER: 500
} as const;

describe('Error Handler Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();
  });

  /**
   * Creates a test route that throws a specific error
   */
  const createErrorRoute = (error: Error) => {
    app.get('/test', (req, res, next) => {
      next(error);
    });
    app.use(errorHandler);
  };

  describe('AC-001: Consistent error response format', () => {
    it('should return consistent format for validation errors', async () => {
      const validationError = new AppError(ERROR_MESSAGES.VALIDATION, STATUS_CODES.VALIDATION_ERROR);
      createErrorRoute(validationError);

      const response = await request(app)
        .get('/test')
        .expect(STATUS_CODES.VALIDATION_ERROR);

      expect(response.body).toEqual({
        error: {
          message: ERROR_MESSAGES.VALIDATION,
          status: STATUS_CODES.VALIDATION_ERROR,
          timestamp: expect.any(String)
        }
      });
    });

    it('should return consistent format for not found errors', async () => {
      const notFoundError = new AppError(ERROR_MESSAGES.NOT_FOUND, STATUS_CODES.NOT_FOUND);
      createErrorRoute(notFoundError);

      const response = await request(app)
        .get('/test')
        .expect(STATUS_CODES.NOT_FOUND);

      expect(response.body).toEqual({
        error: {
          message: ERROR_MESSAGES.NOT_FOUND,
          status: STATUS_CODES.NOT_FOUND,
          timestamp: expect.any(String)
        }
      });
    });

    it('should return consistent format for generic errors', async () => {
      const genericError = new Error('Database connection failed');
      createErrorRoute(genericError);

      const response = await request(app)
        .get('/test')
        .expect(STATUS_CODES.INTERNAL_SERVER);

      expect(response.body).toEqual({
        error: {
          message: ERROR_MESSAGES.GENERIC,
          status: STATUS_CODES.INTERNAL_SERVER,
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('AC-002: Correct status codes for different error types', () => {
    it('should return 400 for bad request errors', async () => {
      const badRequestError = new AppError('Invalid input', STATUS_CODES.BAD_REQUEST);
      createErrorRoute(badRequestError);

      await request(app)
        .get('/test')
        .expect(STATUS_CODES.BAD_REQUEST);
    });

    it('should return 401 for authentication errors', async () => {
      const authError = new AppError(ERROR_MESSAGES.UNAUTHORIZED, STATUS_CODES.UNAUTHORIZED);
      createErrorRoute(authError);

      await request(app)
        .get('/test')
        .expect(STATUS_CODES.UNAUTHORIZED);
    });

    it('should return 422 for validation errors', async () => {
      const validationError = new AppError(ERROR_MESSAGES.VALIDATION, STATUS_CODES.VALIDATION_ERROR);
      createErrorRoute(validationError);

      await request(app)
        .get('/test')
        .expect(STATUS_CODES.VALIDATION_ERROR);
    });

    it('should return 500 for unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected system error');
      createErrorRoute(unexpectedError);

      await request(app)
        .get('/test')
        .expect(STATUS_CODES.INTERNAL_SERVER);
    });
  });

  describe('AC-003: Error logging without information exposure', () => {
    it('should log full error details for AppErrors', async () => {
      const appError = new AppError(ERROR_MESSAGES.VALIDATION, STATUS_CODES.VALIDATION_ERROR);
      createErrorRoute(appError);

      await request(app).get('/test');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application Error',
        expect.objectContaining({
          message: ERROR_MESSAGES.VALIDATION,
          status: STATUS_CODES.VALIDATION_ERROR,
          stack: expect.any(String)
        })
      );
    });

    it('should log full error details for unexpected errors', async () => {
      const unexpectedError = new Error('Database connection failed');
      createErrorRoute(unexpectedError);

      await request(app).get('/test');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected Error',
        expect.objectContaining({
          message: 'Database connection failed',
          stack: expect.any(String)
        })
      );
    });

    it('should not expose sensitive error details in response', async () => {
      const sensitiveError = new Error('Database password: secret123');
      createErrorRoute(sensitiveError);

      const response = await request(app)
        .get('/test')
        .expect(STATUS_CODES.INTERNAL_SERVER);

      expect(response.body.error.message).toBe(ERROR_MESSAGES.GENERIC);
      expect(response.body.error.message).not.toContain('secret123');
      expect(response.body.error.message).not.toContain('Database password');
    });

    it('should not include stack traces in response', async () => {
      const errorWithStack = new Error('Test error');
      createErrorRoute(errorWithStack);

      const response = await request(app).get('/test');

      expect(response.body.error).not.toHaveProperty('stack');
    });
  });

  describe('AC-004: Graceful handling of unexpected errors', () => {
    it('should handle null errors gracefully', async () => {
      app.get('/test', (req, res, next) => {
        next(null as any);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(STATUS_CODES.INTERNAL_SERVER);

      expect(response.body.error.message).toBe(ERROR_MESSAGES.GENERIC);
    });

    it('should handle undefined errors gracefully', async () => {
      app.get('/test', (req, res, next) => {
        next(undefined as any);
      });
      app.use(errorHandler);

      const response = await request(app)
        .get('/test')
        .expect(STATUS_CODES.INTERNAL_SERVER);

      expect(response.body.error.message).toBe(ERROR_MESSAGES.GENERIC);
    });

    it('should handle errors with circular references', async () => {
      const circularError = new Error('Circular reference error');
      (circularError as any).circular = circularError;
      createErrorRoute(circularError);

      const response = await request(app)
        .get('/test')
        .expect(STATUS_CODES.INTERNAL_SERVER);

      expect(response.body.error.message).toBe(ERROR_MESSAGES.GENERIC);
    });

    it('should handle errors without message property', async () => {
      const errorWithoutMessage = Object.create(Error.prototype);
      createErrorRoute(errorWithoutMessage);

      const response = await request(app)
        .get('/test')
        .expect(STATUS_CODES.INTERNAL_SERVER);

      expect(response.body.error.message).toBe(ERROR_MESSAGES.GENERIC);
    });

    it('should handle database connection errors gracefully', async () => {
      const dbError = new Error('ECONNREFUSED: Connection refused');
      createErrorRoute(dbError);

      const response = await request(app)
        .get('/test')
        .expect(STATUS_CODES.INTERNAL_SERVER);

      expect(response.body.error.message).toBe(ERROR_MESSAGES.GENERIC);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected Error',
        expect.objectContaining({
          message: 'ECONNREFUSED: Connection refused'
        })
      );
    });

    it('should ensure response is always sent', async () => {
      const testError = new AppError('Test error', STATUS_CODES.BAD_REQUEST);
      createErrorRoute(testError);

      const response = await request(app).get('/test');

      expect(response.status).toBe(STATUS_CODES.BAD_REQUEST);
      expect(response.body).toBeDefined();
      expect(response.body.error).toBeDefined();
    });
  });
});