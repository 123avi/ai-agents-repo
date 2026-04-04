import { Pool } from 'pg';
import { createPool, checkConnectionHealth, closePool } from '../config';

// Mock the pg module
jest.mock('pg', () => ({
  Pool: jest.fn()
}));

const MockPool = Pool as jest.MockedClass<typeof Pool>;

describe('Database Configuration', () => {
  let mockPoolInstance: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    mockPoolInstance = {
      on: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    };
    MockPool.mockImplementation(() => mockPoolInstance);
    // Clear any existing pool instance
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('createPool', () => {
    it('should create pool with correct configuration', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb';
      process.env.NODE_ENV = 'development';

      const pool = createPool();

      expect(MockPool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/testdb',
        min: 20,
        max: 50,
        connectionTimeoutMillis: 30000,
        idleTimeoutMillis: 10000,
        ssl: false
      });
      expect(mockPoolInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(pool).toBe(mockPoolInstance);
    });

    it('should enable SSL in production', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb';
      process.env.NODE_ENV = 'production';

      createPool();

      expect(MockPool).toHaveBeenCalledWith(expect.objectContaining({
        ssl: { rejectUnauthorized: false }
      }));
    });

    it('should throw error when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;

      expect(() => createPool()).toThrow('DATABASE_URL environment variable is required');
    });

    it('should return same pool on subsequent calls', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb';

      const pool1 = createPool();
      const pool2 = createPool();

      expect(MockPool).toHaveBeenCalledTimes(1);
      expect(pool1).toBe(pool2);
    });
  });

  describe('checkConnectionHealth', () => {
    let mockClient: any;

    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb';
      mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockPoolInstance.connect.mockResolvedValue(mockClient);
    });

    it('should return true when connection is healthy', async () => {
      mockClient.query.mockResolvedValue({});

      const result = await checkConnectionHealth();

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      mockPoolInstance.connect.mockRejectedValue(new Error('Connection failed'));

      const result = await checkConnectionHealth();

      expect(result).toBe(false);
    });

    it('should release client even when query fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Query failed'));

      const result = await checkConnectionHealth();

      expect(result).toBe(false);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('closePool', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/testdb';
    });

    it('should close pool successfully', async () => {
      mockPoolInstance.end.mockResolvedValue(undefined);
      createPool(); // Create pool first

      await closePool();

      expect(mockPoolInstance.end).toHaveBeenCalled();
    });

    it('should handle close errors', async () => {
      const closeError = new Error('Close failed');
      mockPoolInstance.end.mockRejectedValue(closeError);
      createPool(); // Create pool first

      await expect(closePool()).rejects.toThrow('Close failed');
    });

    it('should handle multiple close calls gracefully', async () => {
      mockPoolInstance.end.mockResolvedValue(undefined);
      createPool(); // Create pool first

      await closePool();
      await closePool(); // Second call should not throw

      expect(mockPoolInstance.end).toHaveBeenCalledTimes(1);
    });
  });
});