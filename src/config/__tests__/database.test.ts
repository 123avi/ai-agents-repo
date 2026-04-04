import { DB_CONFIG, validateDatabaseConfig } from '../database.js';

describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('DB_CONFIG', () => {
    it('should use environment variables when provided', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';
      process.env.DB_MAX_CONNECTIONS = '50';
      process.env.DB_CONNECTION_TIMEOUT = '20000';
      process.env.DB_IDLE_TIMEOUT = '5000';
      
      // Re-import to get fresh config with new env vars
      jest.resetModules();
      const { DB_CONFIG: freshConfig } = require('../database.js');
      
      expect(freshConfig.connectionString).toBe('postgresql://test:test@localhost/testdb');
      expect(freshConfig.max).toBe(50);
      expect(freshConfig.connectionTimeoutMillis).toBe(20000);
      expect(freshConfig.idleTimeoutMillis).toBe(5000);
      expect(freshConfig.min).toBe(20); // Should always be 20 per NFR
    });

    it('should use defaults when environment variables are not provided', () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_MAX_CONNECTIONS;
      delete process.env.DB_CONNECTION_TIMEOUT;
      delete process.env.DB_IDLE_TIMEOUT;
      
      jest.resetModules();
      const { DB_CONFIG: freshConfig } = require('../database.js');
      
      expect(freshConfig.connectionString).toBe('');
      expect(freshConfig.min).toBe(20);
      expect(freshConfig.max).toBe(100);
      expect(freshConfig.connectionTimeoutMillis).toBe(30000);
      expect(freshConfig.idleTimeoutMillis).toBe(10000);
    });

    it('should handle invalid numeric environment variables', () => {
      process.env.DB_MAX_CONNECTIONS = 'invalid';
      process.env.DB_CONNECTION_TIMEOUT = 'also-invalid';
      
      jest.resetModules();
      const { DB_CONFIG: freshConfig } = require('../database.js');
      
      expect(freshConfig.max).toBe(100); // Should fall back to default
      expect(freshConfig.connectionTimeoutMillis).toBe(30000); // Should fall back to default
    });
  });

  describe('validateDatabaseConfig', () => {
    it('should pass validation with valid DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';
      
      jest.resetModules();
      const { validateDatabaseConfig: freshValidate } = require('../database.js');
      
      expect(() => freshValidate()).not.toThrow();
    });

    it('should throw error when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      
      jest.resetModules();
      const { validateDatabaseConfig: freshValidate } = require('../database.js');
      
      expect(() => freshValidate()).toThrow('DATABASE_URL environment variable is required');
    });

    it('should throw error when DATABASE_URL is empty string', () => {
      process.env.DATABASE_URL = '';
      
      jest.resetModules();
      const { validateDatabaseConfig: freshValidate } = require('../database.js');
      
      expect(() => freshValidate()).toThrow('DATABASE_URL environment variable is required');
    });

    it('should throw error when minimum connections is below NFR requirement', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';
      
      jest.resetModules();
      // Mock DB_CONFIG to have invalid min connections
      const dbModule = require('../database.js');
      dbModule.DB_CONFIG.min = 10; // Below required 20
      
      expect(() => dbModule.validateDatabaseConfig()).toThrow('Minimum connections must be at least 20 per NFR requirements');
    });
  });
});