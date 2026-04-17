import { Pool, PoolClient, QueryResult } from 'pg';
import { DatabasePool, getPool, PoolStats } from '../pool';
import { getDatabaseConfig, validateDatabaseConfig } from '../config';

// Mock pg module
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockConnect = jest.fn();
  const mockEnd = jest.fn();
  const mockOn = jest.fn();

  const MockPool = jest.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
    on: mockOn,
    totalCount: 10,
    idleCount: 5,
    waitingCount: 2
  }));

  return {
    Pool: MockPool,
    __mockQuery: mockQuery,
    __mockConnect: mockConnect,
    __mockEnd: mockEnd,
    __mockOn: mockOn
  };
});

// Mock config module
jest.mock('../config', () => ({
  getDatabaseConfig: jest.fn(),
  validateDatabaseConfig: jest.fn()
}));

const mockGetDatabaseConfig = getDatabaseConfig as jest.MockedFunction<typeof getDatabaseConfig>;
const mockValidateDatabaseConfig = validateDatabaseConfig as jest.MockedFunction<typeof validateDatabaseConfig>;
const { __mockQuery, __mockConnect, __mockEnd, __mockOn } = jest.requireMock('pg');

describe('DatabasePool', () => {
  const mockConfig = {
    host: 'localhost',
    port: 5432,
    database: 'test',
    user: 'testuser',
    password: 'testpass',
    minConnections: 5,
    maxConnections: 20,
    idleTimeoutMillis: 30000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabaseConfig.mockReturnValue(mockConfig);
    mockValidateDatabaseConfig.mockImplementation(() => {});
  });

  describe('constructor', () => {
    it('should create pool with correct configuration', () => {
      const pool = new DatabasePool();
      
      expect(getDatabaseConfig).toHaveBeenCalled();
      expect(validateDatabaseConfig).toHaveBeenCalledWith(mockConfig);
      expect(Pool).toHaveBeenCalledWith({
        host: mockConfig.host,
        port: mockConfig.port,
        database: mockConfig.database,
        user: mockConfig.user,
        password: mockConfig.password,
        min: mockConfig.minConnections,
        max: mockConfig.maxConnections,
        idleTimeoutMillis: mockConfig.idleTimeoutMillis
      });
    });

    it('should setup error handlers', () => {
      new DatabasePool();
      
      expect(__mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(__mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should throw error if configuration is invalid', () => {
      mockValidateDatabaseConfig.mockImplementation(() => {
        throw new Error('Invalid config');
      });
      
      expect(() => new DatabasePool()).toThrow('Invalid config');
    });
  });

  describe('query', () => {
    it('should execute query successfully', async () => {
      const pool = new DatabasePool();
      const mockResult: QueryResult = {
        rows: [{ id: 1, name: 'test' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };
      
      __mockQuery.mockResolvedValue(mockResult);
      
      const result = await pool.query('SELECT * FROM test', ['param']);
      
      expect(__mockQuery).toHaveBeenCalledWith('SELECT * FROM test', ['param']);
      expect(result).toEqual(mockResult);
    });

    it('should retry on failure and eventually succeed', async () => {
      const pool = new DatabasePool();
      const mockResult: QueryResult = {
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };
      
      __mockQuery
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValue(mockResult);
      
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return {} as any;
      });
      
      const result = await pool.query('SELECT * FROM test');
      
      expect(__mockQuery).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockResult);
      
      jest.restoreAllMocks();
    });

    it('should throw error after max retries', async () => {
      const pool = new DatabasePool();
      const error = new Error('Persistent connection failure');
      
      __mockQuery.mockRejectedValue(error);
      
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return {} as any;
      });
      
      await expect(pool.query('SELECT * FROM test')).rejects.toThrow('Persistent connection failure');
      expect(__mockQuery).toHaveBeenCalledTimes(3);
      
      jest.restoreAllMocks();
    });
  });

  describe('getClient', () => {
    it('should return a client successfully', async () => {
      const pool = new DatabasePool();
      const mockClient = { release: jest.fn() } as any;
      
      __mockConnect.mockResolvedValue(mockClient);
      
      const client = await pool.getClient();
      
      expect(__mockConnect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it('should handle connection failure', async () => {
      const pool = new DatabasePool();
      const error = new Error('Connection failed');
      
      __mockConnect.mockRejectedValue(error);
      
      await expect(pool.getClient()).rejects.toThrow('Connection failed');
    });
  });

  describe('getPoolStats', () => {
    it('should return comprehensive pool statistics', () => {
      const pool = new DatabasePool();
      
      const stats = pool.getPoolStats();
      
      expect(stats).toEqual({
        totalConnections: 10,
        idleConnections: 5,
        waitingClients: 2,
        configuration: {
          minConnections: mockConfig.minConnections,
          maxConnections: mockConfig.maxConnections,
          idleTimeoutMillis: mockConfig.idleTimeoutMillis,
          host: mockConfig.host,
          database: mockConfig.database
        },
        health: {
          isHealthy: true,
          lastConnectionTest: undefined,
          errorCount: 0
        }
      });
    });
  });

  describe('close', () => {
    it('should close pool successfully', async () => {
      const pool = new DatabasePool();
      
      __mockEnd.mockResolvedValue(undefined);
      
      await pool.close();
      
      expect(__mockEnd).toHaveBeenCalled();
    });

    it('should handle close errors', async () => {
      const pool = new DatabasePool();
      const error = new Error('Close failed');
      
      __mockEnd.mockRejectedValue(error);
      
      await expect(pool.close()).rejects.toThrow('Close failed');
    });
  });

  describe('getPool singleton', () => {
    it('should return same instance on multiple calls', () => {
      const pool1 = getPool();
      const pool2 = getPool();
      
      expect(pool1).toBe(pool2);
    });
  });
});