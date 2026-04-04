import pino from 'pino';
import { logger, logDatabaseEvent, logDatabaseError } from '../logger.js';

// Mock pino
jest.mock('pino');
const mockPino = pino as jest.MockedFunction<typeof pino>;
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
};

describe('Logger', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockPino.mockReturnValue(mockLogger as any);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('logger configuration', () => {
    it('should create logger with default configuration', () => {
      delete process.env.LOG_LEVEL;
      delete process.env.NODE_ENV;
      
      jest.resetModules();
      require('../logger.js');
      
      expect(mockPino).toHaveBeenCalledWith({
        level: 'info',
        formatters: {
          level: expect.any(Function)
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        transport: {
          target: 'pino-pretty',
          options: { colorize: true }
        }
      });
    });

    it('should use LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'debug';
      
      jest.resetModules();
      require('../logger.js');
      
      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug'
        })
      );
    });

    it('should remove pretty printing in production', () => {
      process.env.NODE_ENV = 'production';
      
      jest.resetModules();
      require('../logger.js');
      
      expect(mockPino).toHaveBeenCalledWith({
        level: 'info',
        formatters: {
          level: expect.any(Function)
        },
        timestamp: pino.stdTimeFunctions.isoTime
      });
    });

    it('should format log levels correctly', () => {
      const config = mockPino.mock.calls[0][0];
      const levelFormatter = config.formatters.level;
      
      expect(levelFormatter('info')).toEqual({ level: 'INFO' });
      expect(levelFormatter('error')).toEqual({ level: 'ERROR' });
    });
  });

  describe('logDatabaseEvent', () => {
    it('should log database events with structured data', () => {
      const event = 'pool_created';
      const metadata = { minConnections: 20, maxConnections: 100 };
      
      logDatabaseEvent(event, metadata);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          event: 'pool_created',
          minConnections: 20,
          maxConnections: 100
        },
        'Database event: pool_created'
      );
    });

    it('should log database events without metadata', () => {
      const event = 'pool_closed';
      
      logDatabaseEvent(event);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        { event: 'pool_closed' },
        'Database event: pool_closed'
      );
    });
  });

  describe('logDatabaseError', () => {
    it('should log database errors with full error context', () => {
      const operation = 'health_check_failed';
      const error = new Error('Connection timeout');
      error.stack = 'Error: Connection timeout\n    at test.js:1:1';
      const context = { responseTimeMs: 5000 };
      
      logDatabaseError(operation, error, context);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          operation: 'health_check_failed',
          error: 'Connection timeout',
          stack: 'Error: Connection timeout\n    at test.js:1:1',
          responseTimeMs: 5000
        },
        'Database operation failed: health_check_failed'
      );
    });

    it('should log database errors without additional context', () => {
      const operation = 'pool_creation_failed';
      const error = new Error('Invalid connection string');
      
      logDatabaseError(operation, error);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          operation: 'pool_creation_failed',
          error: 'Invalid connection string',
          stack: error.stack
        },
        'Database operation failed: pool_creation_failed'
      );
    });

    it('should handle errors without stack traces', () => {
      const operation = 'query_failed';
      const error = new Error('Query syntax error');
      delete error.stack;
      
      logDatabaseError(operation, error);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          operation: 'query_failed',
          error: 'Query syntax error',
          stack: undefined
        },
        'Database operation failed: query_failed'
      );
    });
  });
});