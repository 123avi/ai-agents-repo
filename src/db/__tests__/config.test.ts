import { validateDatabaseConfig, getDatabaseConfig, DatabaseConfig } from '../config';

describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateDatabaseConfig', () => {
    const validConfig: DatabaseConfig = {
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'testuser',
      password: 'testpass',
      minConnections: 5,
      maxConnections: 20,
      idleTimeoutMillis: 30000
    };

    it('should validate a correct configuration', () => {
      expect(() => validateDatabaseConfig(validConfig)).not.toThrow();
    });

    it('should throw error for missing host', () => {
      const config = { ...validConfig, host: '' };
      expect(() => validateDatabaseConfig(config)).toThrow('Database host is required');
    });

    it('should throw error for missing database name', () => {
      const config = { ...validConfig, database: '' };
      expect(() => validateDatabaseConfig(config)).toThrow('Database name is required');
    });

    it('should throw error for missing user', () => {
      const config = { ...validConfig, user: '' };
      expect(() => validateDatabaseConfig(config)).toThrow('Database user is required');
    });

    it('should throw error for missing password', () => {
      const config = { ...validConfig, password: '' };
      expect(() => validateDatabaseConfig(config)).toThrow('Database password is required');
    });

    it('should throw error for invalid minConnections', () => {
      const config = { ...validConfig, minConnections: 0 };
      expect(() => validateDatabaseConfig(config)).toThrow('minConnections must be between 1 and 50');
    });

    it('should throw error when maxConnections < minConnections', () => {
      const config = { ...validConfig, minConnections: 10, maxConnections: 5 };
      expect(() => validateDatabaseConfig(config)).toThrow('maxConnections must be greater than or equal to minConnections');
    });

    it('should throw error for maxConnections > 100', () => {
      const config = { ...validConfig, maxConnections: 101 };
      expect(() => validateDatabaseConfig(config)).toThrow('maxConnections cannot exceed 100');
    });
  });

  describe('getDatabaseConfig', () => {
    it('should load configuration from environment variables', () => {
      process.env.DB_HOST = 'testhost';
      process.env.DB_PORT = '5433';
      process.env.DB_NAME = 'testdb';
      process.env.DB_USER = 'testuser';
      process.env.DB_PASSWORD = 'testpass';
      process.env.DB_MIN_CONNECTIONS = '3';
      process.env.DB_MAX_CONNECTIONS = '15';
      process.env.DB_IDLE_TIMEOUT = '25000';

      const config = getDatabaseConfig();

      expect(config.host).toBe('testhost');
      expect(config.port).toBe(5433);
      expect(config.database).toBe('testdb');
      expect(config.user).toBe('testuser');
      expect(config.password).toBe('testpass');
      expect(config.minConnections).toBe(3);
      expect(config.maxConnections).toBe(15);
      expect(config.idleTimeoutMillis).toBe(25000);
    });

    it('should use default values when environment variables are not set', () => {
      process.env.DB_PASSWORD = 'required';
      
      const config = getDatabaseConfig();

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('todoapi');
      expect(config.user).toBe('postgres');
      expect(config.minConnections).toBe(5);
      expect(config.maxConnections).toBe(20);
      expect(config.idleTimeoutMillis).toBe(30000);
    });

    it('should throw error for invalid configuration from environment', () => {
      process.env.DB_MIN_CONNECTIONS = '0';
      process.env.DB_PASSWORD = 'test';
      
      expect(() => getDatabaseConfig()).toThrow('minConnections must be between 1 and 50');
    });
  });
});