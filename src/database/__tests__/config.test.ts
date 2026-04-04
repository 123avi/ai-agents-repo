import { createDatabasePool, closeDatabasePool } from '../config';
import { Pool } from 'pg';

// Mock pg module
jest.mock('pg');
const MockPool = Pool as jest.MockedClass<typeof Pool>;

describe('Database Config', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    MockPool.mockClear();
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });

  describe('createDatabasePool', () => {
    it('should create pool with required environment variables', () => {
      process.env.DB_USER = 'testuser';
      process.env.DB_PASSWORD = 'testpass';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'testdb';
      
      createDatabasePool();
      
      expect(MockPool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        min: 5,
        max: 20,
        connectionTimeoutMillis: 30000,
        idleTimeoutMillis: 10000
      });
    });

    it('should use default values when optional env vars not set', () => {
      process.env.DB_USER = 'testuser';
      process.env.DB_PASSWORD = 'testpass';
      // DB_HOST, DB_PORT, DB_NAME not set
      
      createDatabasePool();
      
      expect(MockPool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'todos_db',
        user: 'testuser',
        password: 'testpass',
        min: 5,
        max: 20,
        connectionTimeoutMillis: 30000,
        idleTimeoutMillis: 10000
      });
    });

    it('should throw error when DB_USER is missing', () => {
      process.env.DB_PASSWORD = 'testpass';
      // DB_USER not set
      
      expect(() => createDatabasePool()).toThrow('DB_USER environment variable is required');
    });

    it('should throw error when DB_PASSWORD is missing', () => {
      process.env.DB_USER = 'testuser';
      // DB_PASSWORD not set
      
      expect(() => createDatabasePool()).toThrow('DB_PASSWORD environment variable is required');
    });

    it('should handle custom port as string', () => {
      process.env.DB_USER = 'testuser';
      process.env.DB_PASSWORD = 'testpass';
      process.env.DB_PORT = '5433';
      
      createDatabasePool();
      
      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({ port: 5433 })
      );
    });
  });

  describe('closeDatabasePool', () => {
    it('should close pool successfully', async () => {
      const mockPool = {
        end: jest.fn().mockResolvedValue(undefined)
      } as unknown as Pool;
      
      await expect(closeDatabasePool(mockPool)).resolves.not.toThrow();
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle pool close errors', async () => {
      const closeError = new Error('Failed to close pool');
      const mockPool = {
        end: jest.fn().mockRejectedValue(closeError)
      } as unknown as Pool;
      
      await expect(closeDatabasePool(mockPool)).rejects.toThrow('Failed to close pool');
    });
  });
});