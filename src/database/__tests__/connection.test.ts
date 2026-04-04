import { Pool } from 'pg';
import { 
  createConnectionPool, 
  getConnectionPool, 
  checkConnectionHealth, 
  closeConnectionPool 
} from '../connection';

// Mock pg module
jest.mock('pg');
const MockPool = Pool as jest.MockedClass<typeof Pool>;

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Database Connection', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn().mockResolvedValue(undefined),
      on: jest.fn()
    } as any;

    MockPool.mockImplementation(() => mockPool);

    // Reset environment
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createConnectionPool', () => {
    it('should create pool with correct configuration when DATABASE_URL is set', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

      const pool = createConnectionPool();

      expect(MockPool).toHaveBeenCalledWith({
        connectionString: 'postgresql://test:test@localhost:5432/testdb',
        min: 20,
        max: 50,
        connectionTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        allowExitOnIdle: true
      });

      expect(pool).toBe(mockPool);
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should throw error when DATABASE_URL is not set', () => {
      expect(() => createConnectionPool()).toThrow(
        'DATABASE_URL environment variable is required'
      );
    });
  });

  describe('getConnectionPool', () => {
    it('should return existing pool when initialized', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
      
      const createdPool = createConnectionPool();
      const retrievedPool = getConnectionPool();

      expect(retrievedPool).toBe(createdPool);
    });

    it('should throw error when pool not initialized', () => {
      expect(() => getConnectionPool()).toThrow(
        'Connection pool not initialized. Call createConnectionPool() first.'
      );
    });
  });

  describe('checkConnectionHealth', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
      createConnectionPool();
    });

    it('should return true when database is healthy', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ healthy: 1 }] });

      const isHealthy = await checkConnectionHealth();

      expect(isHealthy).toBe(true);
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1 as healthy');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return false when query returns unexpected result', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ healthy: 0 }] });

      const isHealthy = await checkConnectionHealth();

      expect(isHealthy).toBe(false);
    });

    it('should return false and release client when connection fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await checkConnectionHealth();

      expect(isHealthy).toBe(false);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return false when pool is not initialized', async () => {
      // Close the pool first
      await closeConnectionPool();

      const isHealthy = await checkConnectionHealth();

      expect(isHealthy).toBe(false);
    });

    it('should handle pool connection failure gracefully', async () => {
      mockPool.connect.mockRejectedValue(new Error('Pool exhausted'));

      const isHealthy = await checkConnectionHealth();

      expect(isHealthy).toBe(false);
    });
  });

  describe('closeConnectionPool', () => {
    it('should close pool successfully when initialized', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
      createConnectionPool();

      await closeConnectionPool();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle close when pool is not initialized', async () => {
      await expect(closeConnectionPool()).resolves.not.toThrow();
      expect(mockPool.end).not.toHaveBeenCalled();
    });

    it('should throw error when pool.end() fails', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
      createConnectionPool();
      
      const closeError = new Error('Failed to close pool');
      mockPool.end.mockRejectedValue(closeError);

      await expect(closeConnectionPool()).rejects.toThrow('Failed to close pool');
    });
  });
});