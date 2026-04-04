import { Pool, PoolClient } from 'pg';
import { createConnectionPool, getConnectionPool, checkConnectionHealth, closeConnectionPool } from '../connection.js';
import { DB_CONFIG, validateDatabaseConfig } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

// Mock pg module
jest.mock('pg');
const MockPool = Pool as jest.MockedClass<typeof Pool>;

// Mock dependencies
jest.mock('../../config/database.js');
jest.mock('../../utils/logger.js');

const mockValidateDatabaseConfig = validateDatabaseConfig as jest.MockedFunction<typeof validateDatabaseConfig>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Database Connection', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset module state
    jest.resetModules();
    
    // Mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as unknown as jest.Mocked<PoolClient>;
    
    // Mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      totalCount: 5,
      idleCount: 2,
    } as unknown as jest.Mocked<Pool>;
    
    MockPool.mockImplementation(() => mockPool);
    mockValidateDatabaseConfig.mockReturnValue(undefined);
  });

  afterEach(async () => {
    try {
      await closeConnectionPool();
    } catch {
      // Ignore cleanup errors in tests
    }
  });

  describe('createConnectionPool', () => {
    it('should create pool with correct configuration', () => {
      const pool = createConnectionPool();
      
      expect(mockValidateDatabaseConfig).toHaveBeenCalled();
      expect(MockPool).toHaveBeenCalledWith(DB_CONFIG);
      expect(mockPool.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(pool).toBe(mockPool);
    });

    it('should throw error when configuration is invalid', () => {
      const configError = new Error('Invalid database config');
      mockValidateDatabaseConfig.mockImplementation(() => {
        throw configError;
      });

      expect(() => createConnectionPool()).toThrow('Failed to create connection pool: Invalid database config');
      expect(MockPool).not.toHaveBeenCalled();
    });

    it('should handle pool creation failure', () => {
      const poolError = new Error('Pool creation failed');
      MockPool.mockImplementation(() => {
        throw poolError;
      });

      expect(() => createConnectionPool()).toThrow('Failed to create connection pool: Pool creation failed');
    });
  });

  describe('getConnectionPool', () => {
    it('should return existing pool if available', () => {
      // Create initial pool
      const firstPool = createConnectionPool();
      
      // Get pool again - should return same instance
      const secondPool = getConnectionPool();
      
      expect(secondPool).toBe(firstPool);
      expect(MockPool).toHaveBeenCalledTimes(1);
    });

    it('should create new pool if none exists', () => {
      const pool = getConnectionPool();
      
      expect(MockPool).toHaveBeenCalledTimes(1);
      expect(pool).toBe(mockPool);
    });
  });

  describe('checkConnectionHealth', () => {
    beforeEach(() => {
      createConnectionPool();
    });

    it('should return true when connection is healthy', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ health: 1 }] } as any);
      
      const isHealthy = await checkConnectionHealth();
      
      expect(isHealthy).toBe(true);
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1 as health');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      const connectionError = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(connectionError);
      
      const isHealthy = await checkConnectionHealth();
      
      expect(isHealthy).toBe(false);
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).not.toHaveBeenCalled();
      expect(mockClient.release).not.toHaveBeenCalled();
    });

    it('should return false when query fails', async () => {
      const queryError = new Error('Query failed');
      mockClient.query.mockRejectedValue(queryError);
      
      const isHealthy = await checkConnectionHealth();
      
      expect(isHealthy).toBe(false);
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1 as health');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even when query fails', async () => {
      const queryError = new Error('Query failed');
      mockClient.query.mockRejectedValue(queryError);
      
      await checkConnectionHealth();
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('closeConnectionPool', () => {
    it('should close active pool successfully', async () => {
      createConnectionPool();
      
      await closeConnectionPool();
      
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle case when no pool exists', async () => {
      await closeConnectionPool();
      
      expect(mockPool.end).not.toHaveBeenCalled();
    });

    it('should throw error when pool.end() fails', async () => {
      createConnectionPool();
      const endError = new Error('Failed to end pool');
      mockPool.end.mockRejectedValue(endError);
      
      await expect(closeConnectionPool()).rejects.toThrow('Failed to close connection pool: Failed to end pool');
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should reset pool to null after successful close', async () => {
      createConnectionPool();
      
      await closeConnectionPool();
      
      // Verify pool is reset by checking if new pool is created
      const newPool = getConnectionPool();
      expect(MockPool).toHaveBeenCalledTimes(2); // Once for initial, once for new
    });
  });

  describe('error handling and logging', () => {
    it('should log pool creation events', () => {
      createConnectionPool();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'pool_created',
          minConnections: expect.any(Number),
          maxConnections: expect.any(Number)
        }),
        expect.stringContaining('Database event: pool_created')
      );
    });

    it('should log health check success', async () => {
      createConnectionPool();
      mockClient.query.mockResolvedValue({ rows: [{ health: 1 }] } as any);
      
      await checkConnectionHealth();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'health_check_success',
          responseTimeMs: expect.any(Number),
          totalConnections: expect.any(Number),
          idleConnections: expect.any(Number)
        }),
        expect.stringContaining('Database event: health_check_success')
      );
    });

    it('should log health check failures', async () => {
      createConnectionPool();
      const connectionError = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(connectionError);
      
      await checkConnectionHealth();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'health_check_failed',
          error: 'Connection failed',
          responseTimeMs: expect.any(Number)
        }),
        expect.stringContaining('Database operation failed: health_check_failed')
      );
    });

    it('should log pool close events', async () => {
      createConnectionPool();
      
      await closeConnectionPool();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'pool_closing'
        }),
        expect.stringContaining('Database event: pool_closing')
      );
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'pool_closed_successfully'
        }),
        expect.stringContaining('Database event: pool_closed_successfully')
      );
    });
  });
});