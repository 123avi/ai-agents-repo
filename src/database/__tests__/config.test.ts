import { Pool } from 'pg';
import { DB_CONFIG, getConnectionPool, checkConnectionHealth, closeConnectionPool } from '../config';

// Mock pg module
jest.mock('pg', () => {
  const mockConnect = jest.fn();
  const mockQuery = jest.fn();
  const mockRelease = jest.fn();
  const mockEnd = jest.fn();
  const mockOn = jest.fn();
  
  const mockClient = {
    query: mockQuery,
    release: mockRelease,
  };
  
  const mockPool = {
    connect: mockConnect,
    end: mockEnd,
    on: mockOn,
  };
  
  return {
    Pool: jest.fn(() => mockPool),
    __mocks: {
      connect: mockConnect,
      query: mockQuery,
      release: mockRelease,
      end: mockEnd,
      on: mockOn,
      client: mockClient,
      pool: mockPool,
    },
  };
});

const { Pool: MockPool } = jest.requireMock('pg');
const mocks = (jest.requireMock('pg') as any).__mocks;

describe('Database Configuration', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  describe('DB_CONFIG validation', () => {
    it('should throw error when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;
      
      expect(() => {
        jest.isolateModules(() => {
          require('../config');
        });
      }).toThrow('DATABASE_URL environment variable is required and cannot be empty');
    });
    
    it('should throw error when DATABASE_URL is empty string', () => {
      process.env.DATABASE_URL = '';
      
      expect(() => {
        jest.isolateModules(() => {
          require('../config');
        });
      }).toThrow('DATABASE_URL environment variable is required and cannot be empty');
    });
    
    it('should throw error when DATABASE_URL is only whitespace', () => {
      process.env.DATABASE_URL = '   ';
      
      expect(() => {
        jest.isolateModules(() => {
          require('../config');
        });
      }).toThrow('DATABASE_URL environment variable is required and cannot be empty');
    });
    
    it('should create valid config when DATABASE_URL is provided', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      
      const config = jest.isolateModules(() => {
        return require('../config').DB_CONFIG;
      });
      
      expect(config.connectionString).toBe('postgresql://user:pass@localhost:5432/testdb');
      expect(config.min).toBe(20);
      expect(config.max).toBe(100);
      expect(config.idleTimeoutMillis).toBe(30000);
      expect(config.connectionTimeoutMillis).toBe(2000);
    });
  });
  
  describe('getConnectionPool', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    });
    
    it('should create a new pool on first call', () => {
      const pool = getConnectionPool();
      
      expect(MockPool).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@localhost:5432/testdb',
        min: 20,
        max: 100,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      expect(mocks.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
    
    it('should return same pool on subsequent calls', () => {
      const pool1 = getConnectionPool();
      const pool2 = getConnectionPool();
      
      expect(pool1).toBe(pool2);
      expect(MockPool).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('checkConnectionHealth', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      mocks.connect.mockResolvedValue(mocks.client);
    });
    
    it('should return true when health check passes', async () => {
      mocks.query.mockResolvedValue({ rows: [{ health_check: 1 }] });
      
      const result = await checkConnectionHealth();
      
      expect(result).toBe(true);
      expect(mocks.connect).toHaveBeenCalled();
      expect(mocks.query).toHaveBeenCalledWith('SELECT 1 as health_check');
      expect(mocks.release).toHaveBeenCalled();
    });
    
    it('should return false when query fails', async () => {
      mocks.query.mockRejectedValue(new Error('Connection failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await checkConnectionHealth();
      
      expect(result).toBe(false);
      expect(mocks.release).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Database health check failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
    
    it('should return false when connection fails', async () => {
      mocks.connect.mockRejectedValue(new Error('Cannot connect'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await checkConnectionHealth();
      
      expect(result).toBe(false);
      expect(mocks.release).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Database health check failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
    
    it('should return false when health check returns unexpected result', async () => {
      mocks.query.mockResolvedValue({ rows: [] });
      
      const result = await checkConnectionHealth();
      
      expect(result).toBe(false);
      expect(mocks.release).toHaveBeenCalled();
    });
  });
  
  describe('closeConnectionPool', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    });
    
    it('should close pool successfully', async () => {
      mocks.end.mockResolvedValue(undefined);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Create pool first
      getConnectionPool();
      
      await closeConnectionPool();
      
      expect(mocks.end).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Database connection pool closed successfully');
      
      consoleSpy.mockRestore();
    });
    
    it('should handle pool close errors', async () => {
      const closeError = new Error('Close failed');
      mocks.end.mockRejectedValue(closeError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Create pool first
      getConnectionPool();
      
      await expect(closeConnectionPool()).rejects.toThrow('Close failed');
      expect(consoleSpy).toHaveBeenCalledWith('Error closing connection pool:', closeError);
      
      consoleSpy.mockRestore();
    });
    
    it('should do nothing when no pool exists', async () => {
      await closeConnectionPool();
      
      expect(mocks.end).not.toHaveBeenCalled();
    });
  });
});