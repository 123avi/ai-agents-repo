import { config, validateDatabaseConfig } from '../database';

describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    it('should throw error when required env vars are missing', () => {
      delete process.env.DB_HOST;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;

      expect(() => {
        require('../database');
      }).toThrow('Missing required environment variables: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD');
    });

    it('should throw error for partial missing env vars', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'testdb';
      // Missing DB_USER and DB_PASSWORD

      expect(() => {
        require('../database');
      }).toThrow('Missing required environment variables: DB_USER, DB_PASSWORD');
    });
  });

  describe('Configuration Loading', () => {
    beforeEach(() => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'testdb';
      process.env.DB_USER = 'testuser';
      process.env.DB_PASSWORD = 'testpass';
    });

    it('should load configuration with default values', () => {
      const { config } = require('../database');
      
      expect(config).toEqual({
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        ssl: false,
        maxConnections: 20,
        minConnections: 5
      });
    });

    it('should load configuration with custom values', () => {
      process.env.DB_PORT = '3306';
      process.env.DB_SSL = 'true';
      process.env.DB_MAX_CONNECTIONS = '15';
      process.env.DB_MIN_CONNECTIONS = '3';
      
      const { config } = require('../database');
      
      expect(config).toEqual({
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        ssl: { rejectUnauthorized: false },
        maxConnections: 15,
        minConnections: 3
      });
    });
  });

  describe('Configuration Validation', () => {
    beforeEach(() => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'testdb';
      process.env.DB_USER = 'testuser';
      process.env.DB_PASSWORD = 'testpass';
    });

    it('should pass validation with valid config', () => {
      const { validateDatabaseConfig } = require('../database');
      expect(() => validateDatabaseConfig()).not.toThrow();
    });

    it('should throw error for invalid port', () => {
      process.env.DB_PORT = '0';
      const { validateDatabaseConfig } = require('../database');
      expect(() => validateDatabaseConfig()).toThrow('Invalid database port: 0');
    });

    it('should throw error when max < min connections', () => {
      process.env.DB_MAX_CONNECTIONS = '5';
      process.env.DB_MIN_CONNECTIONS = '10';
      const { validateDatabaseConfig } = require('../database');
      expect(() => validateDatabaseConfig()).toThrow('DB_MAX_CONNECTIONS must be greater than or equal to DB_MIN_CONNECTIONS');
    });

    it('should throw error for zero min connections', () => {
      process.env.DB_MIN_CONNECTIONS = '0';
      const { validateDatabaseConfig } = require('../database');
      expect(() => validateDatabaseConfig()).toThrow('DB_MIN_CONNECTIONS must be at least 1');
    });

    it('should throw error for excessive max connections', () => {
      process.env.DB_MAX_CONNECTIONS = '150';
      const { validateDatabaseConfig } = require('../database');
      expect(() => validateDatabaseConfig()).toThrow('DB_MAX_CONNECTIONS should not exceed 100 for typical applications');
    });
  });
});