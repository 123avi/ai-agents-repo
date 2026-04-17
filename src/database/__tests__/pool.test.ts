import { Pool } from 'pg';
import { databasePool, query, getClient, closePool, getPoolStats } from '../pool';
import { logger } from '../../utils/logger';

// Mock pg module
jest.mock('pg');
const MockPool = Pool as jest.MockedClass<typeof Pool>;

// Mock logger
jest.mock('../../utils/logger');
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock database config
jest.mock('../../config/database', () => ({
  config: {
    host: 'localhost',
    port: 5432,
    database: 'testdb',
    user: 'testuser',
    password: 'testpass'
  }
}));

describe('DatabasePool', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0
    } as any;
    
    MockPool.mockImplementation(() => mockPool);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await closePool();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('Pool Configuration', () => {
    it('should create pool with correct configuration', () => {
      expect(MockPool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        min: 5,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statement_timeout: 30000
      });
    });

    it('should set up event listeners', () => {
      expect(mockPool.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('remove', expect.any(Function));
    });
  });

  describe('getClient', () => {
    it('should return client successfully', async () => {
      const client = await getClient();
      
      expect(mockPool.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it('should retry connection on failure', async () => {
      mockPool.connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValue(mockClient);

      const client = await getClient();
      
      expect(mockPool.connect).toHaveBeenCalledTimes(3);
      expect(client).toBe(mockClient);
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(getClient()).rejects.toThrow('Failed to connect to database after 3 attempts');
      expect(mockPool.connect).toHaveBeenCalledTimes(3);
    });
  });

  describe('query', () => {
    it('should execute query successfully', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await query('SELECT * FROM users WHERE id = $1', [1]);
      
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it('should release client on query error', async () => {
      const error = new Error('Query failed');
      mockClient.query.mockRejectedValue(error);

      await expect(query('SELECT * FROM users')).rejects.toThrow('Query failed');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Database query failed:', {
        text: 'SELECT * FROM users',
        error
      });
    });
  });

  describe('getPoolStats', () => {
    it('should return pool statistics', () => {
      const stats = getPoolStats();
      
      expect(stats).toEqual({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0
      });
    });
  });

  describe('closePool', () => {
    it('should close pool successfully', async () => {
      await closePool();
      
      expect(mockPool.end).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Database pool closed successfully');
    });

    it('should handle close errors', async () => {
      const error = new Error('Close failed');
      mockPool.end.mockRejectedValue(error);

      await expect(closePool()).rejects.toThrow('Close failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Error closing database pool:', error);
    });

    it('should reject new connections after shutdown', async () => {
      await closePool();
      
      await expect(getClient()).rejects.toThrow('Database pool is shutting down');
    });
  });
});