import { DatabasePool } from '../DatabasePool';
import { ConsoleLogger } from '../../utils/Logger';
import { Pool, PoolClient } from 'pg';

// Mock the pg module
jest.mock('pg');
const MockedPool = Pool as jest.MockedClass<typeof Pool>;

describe('DatabasePool', () => {
  let databasePool: DatabasePool;
  let mockLogger: ConsoleLogger;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock logger
    mockLogger = new ConsoleLogger();
    jest.spyOn(mockLogger, 'info').mockImplementation();
    jest.spyOn(mockLogger, 'error').mockImplementation();
    jest.spyOn(mockLogger, 'debug').mockImplementation();

    // Setup mock client
    mockClient = {
      release: jest.fn(),
      query: jest.fn(),
      end: jest.fn()
    } as any;

    // Setup mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0
    } as any;

    MockedPool.mockImplementation(() => mockPool);

    const config = {
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      user: 'testuser',
      password: 'testpass'
    };

    databasePool = new DatabasePool(config, mockLogger);
  });

  describe('initialize', () => {
    it('should successfully initialize database pool with test connection', async () => {
      // AC-001: Test successful database connection
      await databasePool.initialize();

      expect(MockedPool).toHaveBeenCalledWith(expect.objectContaining({
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      }));
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Database pool initialized successfully',
        expect.objectContaining({
          maxConnections: 20,
          database: 'testdb'
        })
      );
    });

    it('should handle initialization failure and throw error', async () => {
      // AC-003: Test connection failure handling
      const connectionError = new Error('Connection refused');
      mockPool.connect.mockRejectedValueOnce(connectionError);

      await expect(databasePool.initialize()).rejects.toThrow(
        'Database pool initialization failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize database pool',
        { error: connectionError }
      );
    });

    it('should apply default pool configuration values', async () => {
      // AC-002: Test connection pool configuration
      await databasePool.initialize();

      expect(MockedPool).toHaveBeenCalledWith(expect.objectContaining({
        max: 20, // DEFAULT_MAX_CONNECTIONS
        idleTimeoutMillis: 30000, // DEFAULT_IDLE_TIMEOUT_MS
        connectionTimeoutMillis: 5000 // DEFAULT_CONNECTION_TIMEOUT_MS
      }));
    });

    it('should override default configuration with provided values', async () => {
      // AC-002: Test connection pool configuration
      const customConfig = {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        max: 50,
        idleTimeoutMillis: 60000
      };

      const customPool = new DatabasePool(customConfig, mockLogger);
      await customPool.initialize();

      expect(MockedPool).toHaveBeenCalledWith(expect.objectContaining({
        max: 50,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 5000 // Still uses default
      }));
    });
  });

  describe('getClient', () => {
    beforeEach(async () => {
      await databasePool.initialize();
    });

    it('should successfully acquire client from pool', async () => {
      // AC-001: Test successful database connection
      const client = await databasePool.getClient();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it('should throw error when pool is not initialized', async () => {
      // AC-003: Test connection failure handling
      const uninitializedPool = new DatabasePool({}, mockLogger);

      await expect(uninitializedPool.getClient()).rejects.toThrow(
        'Database pool not initialized'
      );
    });

    it('should throw error when pool is shutting down', async () => {
      // AC-004: Test pool cleanup on shutdown
      await databasePool.shutdown();

      await expect(databasePool.getClient()).rejects.toThrow(
        'Database pool is shutting down'
      );
    });

    it('should handle client acquisition failure', async () => {
      // AC-003: Test connection failure handling
      const acquireError = new Error('Pool exhausted');
      mockPool.connect.mockResolvedValueOnce(mockClient); // For initialization
      mockPool.connect.mockRejectedValueOnce(acquireError);

      await expect(databasePool.getClient()).rejects.toThrow(acquireError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to acquire database client',
        { error: acquireError }
      );
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await databasePool.initialize();
    });

    it('should gracefully shutdown pool and cleanup resources', async () => {
      // AC-004: Test pool cleanup on shutdown
      await databasePool.shutdown();

      expect(mockPool.end).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Shutting down database pool');
      expect(mockLogger.info).toHaveBeenCalledWith('Database pool shutdown completed');
    });

    it('should handle shutdown errors appropriately', async () => {
      // AC-003: Test connection failure handling during shutdown
      const shutdownError = new Error('Shutdown timeout');
      mockPool.end.mockRejectedValueOnce(shutdownError);

      await expect(databasePool.shutdown()).rejects.toThrow(shutdownError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during database pool shutdown',
        { error: shutdownError }
      );
    });

    it('should be safe to call shutdown multiple times', async () => {
      // AC-004: Test pool cleanup on shutdown
      await databasePool.shutdown();
      await databasePool.shutdown(); // Second call should be safe

      expect(mockPool.end).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call shutdown on uninitialized pool', async () => {
      // AC-004: Test pool cleanup on shutdown
      const uninitializedPool = new DatabasePool({}, mockLogger);
      
      await expect(uninitializedPool.shutdown()).resolves.toBeUndefined();
      expect(mockPool.end).not.toHaveBeenCalled();
    });
  });

  describe('getPoolStatus', () => {
    it('should return not_initialized status for uninitialized pool', () => {
      // AC-002: Test connection pool configuration
      const uninitializedPool = new DatabasePool({}, mockLogger);
      const status = uninitializedPool.getPoolStatus();

      expect(status).toEqual({ status: 'not_initialized' });
    });

    it('should return active status with pool metrics when initialized', async () => {
      // AC-002: Test connection pool configuration
      await databasePool.initialize();
      const status = databasePool.getPoolStatus();

      expect(status).toEqual({
        status: 'active',
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0
      });
    });

    it('should return shutting_down status during shutdown', async () => {
      // AC-004: Test pool cleanup on shutdown
      await databasePool.initialize();
      
      // Mock end to delay completion so we can check status during shutdown
      let resolveEnd: () => void;
      const endPromise = new Promise<void>((resolve) => {
        resolveEnd = resolve;
      });
      mockPool.end.mockReturnValue(endPromise);

      // Start shutdown but don't wait
      const shutdownPromise = databasePool.shutdown();
      
      // Check status while shutdown is in progress
      const status = databasePool.getPoolStatus();
      expect(status).toEqual(expect.objectContaining({
        status: 'shutting_down'
      }));

      // Complete shutdown
      resolveEnd!();
      await shutdownPromise;
    });
  });

  describe('setupPoolEventHandlers', () => {
    it('should setup event handlers for pool monitoring', async () => {
      // AC-005: All tests pass with proper mocking
      await databasePool.initialize();

      expect(mockPool.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('remove', expect.any(Function));
    });

    it('should log debug message on client connect', async () => {
      await databasePool.initialize();
      
      // Get the connect event handler
      const connectHandler = mockPool.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1] as Function;
      
      // Trigger the connect event
      connectHandler();
      
      expect(mockLogger.debug).toHaveBeenCalledWith('New database client connected');
    });

    it('should log error message on pool error', async () => {
      await databasePool.initialize();
      
      // Get the error event handler
      const errorHandler = mockPool.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1] as Function;
      
      const poolError = new Error('Pool connection lost');
      
      // Trigger the error event
      errorHandler(poolError);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database pool error',
        { error: poolError }
      );
    });

    it('should log debug message on client remove', async () => {
      await databasePool.initialize();
      
      // Get the remove event handler
      const removeHandler = mockPool.on.mock.calls.find(
        call => call[0] === 'remove'
      )?.[1] as Function;
      
      // Trigger the remove event
      removeHandler();
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Database client removed from pool');
    });
  });

  describe('createDatabasePool factory', () => {
    it('should create DatabasePool instance with provided configuration', () => {
      // AC-005: All tests pass with proper mocking
      const { createDatabasePool } = require('../DatabasePool');
      const config = { host: 'localhost', database: 'test' };
      const logger = new ConsoleLogger();
      
      const pool = createDatabasePool(config, logger);
      
      expect(pool).toBeInstanceOf(DatabasePool);
    });
  });

  describe('integration scenarios', () => {
    it('should handle full lifecycle: initialize -> connect -> shutdown', async () => {
      // AC-001, AC-004: Complete lifecycle test
      await databasePool.initialize();
      
      const client = await databasePool.getClient();
      expect(client).toBe(mockClient);
      
      await databasePool.shutdown();
      
      await expect(databasePool.getClient()).rejects.toThrow(
        'Database pool is shutting down'
      );
    });

    it('should handle connection timeout scenarios', async () => {
      // AC-003: Test connection failure handling with timeout
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'ConnectionTimeoutError';
      
      mockPool.connect.mockResolvedValueOnce(mockClient); // For initialization
      mockPool.connect.mockRejectedValueOnce(timeoutError);
      
      await databasePool.initialize();
      
      await expect(databasePool.getClient()).rejects.toThrow(timeoutError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to acquire database client',
        { error: timeoutError }
      );
    });

    it('should maintain pool state consistency during concurrent operations', async () => {
      // AC-002: Test connection pool configuration under load
      await databasePool.initialize();
      
      // Simulate multiple concurrent connection requests
      const connectionPromises = Array(5).fill(null).map(async () => {
        const client = await databasePool.getClient();
        return client;
      });
      
      const clients = await Promise.all(connectionPromises);
      expect(clients).toHaveLength(5);
      expect(mockPool.connect).toHaveBeenCalledTimes(6); // 1 for init + 5 for getClient calls
    });
  });

  describe('error boundary tests', () => {
    it('should handle pool creation failure gracefully', async () => {
      // AC-003: Test connection failure handling
      MockedPool.mockImplementation(() => {
        throw new Error('Pool creation failed');
      });
      
      const faultyPool = new DatabasePool({}, mockLogger);
      
      await expect(faultyPool.initialize()).rejects.toThrow(
        'Database pool initialization failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize database pool',
        { error: expect.any(Error) }
      );
    });

    it('should handle null/undefined pool gracefully in getClient', async () => {
      // AC-003: Test connection failure handling
      const pool = new DatabasePool({}, mockLogger);
      // Force pool to be null by not initializing
      
      await expect(pool.getClient()).rejects.toThrow(
        'Database pool not initialized'
      );
    });
  });

  // Coverage test to ensure we hit the mockResolvedValueOnce typo fix
  it('should properly mock resolved values for async operations', async () => {
    // This test specifically ensures the mockResolvedValueOnce (not mkResolvedValueOnce) fix is working
    mockPool.connect.mockResolvedValueOnce(mockClient);
    
    await databasePool.initialize();
    const client = await databasePool.getClient();
    
    expect(client).toBe(mockClient);
    expect(mockPool.connect).toHaveBeenCalled();
  });
});