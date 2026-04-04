import { DatabasePool, DatabaseConfig } from '../database';
import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

const MockedPool = Pool as jest.MockedClass<typeof Pool>;

describe('DatabasePool', () => {
  let databasePool: DatabasePool;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;

  const mockConfig: DatabaseConfig = {
    host: 'localhost',
    port: 5432,
    database: 'test_db',
    user: 'test_user',
    password: 'test_password',
    maxConnections: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  };

  beforeEach(() => {
    databasePool = new DatabasePool();
    
    // Create mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
    } as any;

    // Create mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0,
    } as any;

    MockedPool.mockImplementation(() => mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AC-001: Test successful database connection', () => {
    it('should connect successfully with valid configuration', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const connectedSpy = jest.fn();
      databasePool.on('connected', connectedSpy);

      await databasePool.connect(mockConfig);

      expect(MockedPool).toHaveBeenCalledWith({
        host: mockConfig.host,
        port: mockConfig.port,
        database: mockConfig.database,
        user: mockConfig.user,
        password: mockConfig.password,
        max: mockConfig.maxConnections,
        connectionTimeoutMillis: mockConfig.connectionTimeoutMillis,
        idleTimeoutMillis: mockConfig.idleTimeoutMillis,
      });
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(connectedSpy).toHaveBeenCalled();
    });

    it('should throw error if already initialized', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      await databasePool.connect(mockConfig);

      await expect(databasePool.connect(mockConfig))
        .rejects.toThrow('Database pool already initialized');
    });

    it('should test connection on initialization', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      await databasePool.connect(mockConfig);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('AC-002: Test connection pool configuration', () => {
    it('should configure pool with correct parameters', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      await databasePool.connect(mockConfig);

      expect(MockedPool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
        max: 10,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      });
    });

    it('should return pool status information', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      await databasePool.connect(mockConfig);

      const status = databasePool.getPoolStatus();

      expect(status).toEqual({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
      });
    });

    it('should return empty status when pool not initialized', () => {
      const status = databasePool.getPoolStatus();

      expect(status).toEqual({
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      });
    });

    it('should setup event handlers for pool', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      await databasePool.connect(mockConfig);

      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });
  });

  describe('AC-003: Test connection failure handling', () => {
    it('should handle connection test failure', async () => {
      const connectionError = new Error('Connection refused');
      mockClient.query.mockRejectedValueOnce(connectionError);

      await expect(databasePool.connect(mockConfig))
        .rejects.toThrow('Database connection test failed: Error: Connection refused');
      
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when getting client without connection', async () => {
      await expect(databasePool.getClient())
        .rejects.toThrow('Database pool not available');
    });

    it('should throw error when querying without connection', async () => {
      await expect(databasePool.query('SELECT 1'))
        .rejects.toThrow('Database pool not available');
    });

    it('should emit error events from pool', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      await databasePool.connect(mockConfig);

      const errorSpy = jest.fn();
      databasePool.on('error', errorSpy);

      // Simulate pool error
      const poolError = new Error('Pool error');
      const errorHandler = mockPool.on.mock.calls.find(call => call[0] === 'error')?.[1];
      errorHandler?.(poolError);

      expect(errorSpy).toHaveBeenCalledWith(poolError);
    });

    it('should release client even if query fails', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] }); // For connection test
      await databasePool.connect(mockConfig);

      const queryError = new Error('Query failed');
      mockClient.query.mockRejectedValueOnce(queryError);

      await expect(databasePool.query('SELECT * FROM users'))
        .rejects.toThrow('Query failed');
      
      expect(mockClient.release).toHaveBeenCalledTimes(2); // Once for test, once for failed query
    });
  });

  describe('AC-004: Test pool cleanup on shutdown', () => {
    it('should shutdown gracefully', async () => {
      mockClient.query.mkResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      await databasePool.connect(mockConfig);

      const shuttingDownSpy = jest.fn();
      const shutdownCompleteSpy = jest.fn();
      databasePool.on('shutting_down', shuttingDownSpy);
      databasePool.on('shutdown_complete', shutdownCompleteSpy);

      await databasePool.shutdown();

      expect(shuttingDownSpy).toHaveBeenCalled();
      expect(mockPool.end).toHaveBeenCalled();
      expect(shutdownCompleteSpy).toHaveBeenCalled();
    });

    it('should prevent new connections during shutdown', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      await databasePool.connect(mockConfig);
      
      const shutdownPromise = databasePool.shutdown();
      
      await expect(databasePool.getClient())
        .rejects.toThrow('Database pool not available');
      
      await shutdownPromise;
    });

    it('should handle multiple shutdown calls gracefully', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      await databasePool.connect(mockConfig);

      await databasePool.shutdown();
      await databasePool.shutdown(); // Should not throw

      expect(mockPool.end).toHaveBeenCalledTimes(1);
    });

    it('should handle shutdown when not connected', async () => {
      await databasePool.shutdown(); // Should not throw
      expect(mockPool.end).not.toHaveBeenCalled();
    });
  });

  describe('AC-005: Client connection and query operations', () => {
    beforeEach(async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      await databasePool.connect(mockConfig);
    });

    it('should get client from pool', async () => {
      const client = await databasePool.getClient();
      
      expect(mockPool.connect).toHaveBeenCalledTimes(2); // Once for test, once for getClient
      expect(client).toBe(mockClient);
    });

    it('should execute queries with parameters', async () => {
      const mockResult = { rows: [{ id: 1, name: 'Test' }] };
      mockClient.query.mockResolvedValueOnce(mockResult);

      const result = await databasePool.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it('should execute queries without parameters', async () => {
      const mockResult = { rows: [{ count: 5 }] };
      mockClient.query.mockResolvedValueOnce(mockResult);

      const result = await databasePool.query('SELECT COUNT(*) FROM users');

      expect(mockClient.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM users', undefined);
      expect(result).toBe(mockResult);
    });

    it('should emit client_connected event', async () => {
      const clientConnectedSpy = jest.fn();
      databasePool.on('client_connected', clientConnectedSpy);

      // Simulate pool connect event
      const connectHandler = mockPool.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      connectHandler?.();

      expect(clientConnectedSpy).toHaveBeenCalled();
    });
  });
});