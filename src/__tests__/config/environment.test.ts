import { config } from '../../config/environment.js';
import { ENVIRONMENT } from '../../constants/server.js';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('config initialization', () => {
    it('should load configuration from environment variables', () => {
      expect(config.port).toBeDefined();
      expect(config.nodeEnv).toBeDefined();
      expect(config.jwtSecret).toBeDefined();
      expect(config.corsOrigin).toBeDefined();
      expect(config.databaseUrl).toBeDefined();
    });

    it('should use default port when PORT is not set', () => {
      delete process.env.PORT;
      const { EnvironmentConfig } = require('../../config/environment.js');
      const testConfig = new EnvironmentConfig();
      expect(testConfig.port).toBe(3000);
    });

    it('should throw error for invalid port number', () => {
      process.env.PORT = 'invalid-port';
      const { EnvironmentConfig } = require('../../config/environment.js');
      expect(() => new EnvironmentConfig()).toThrow('Environment variable PORT must be a valid number');
    });

    it('should throw error when required JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      const { EnvironmentConfig } = require('../../config/environment.js');
      expect(() => new EnvironmentConfig()).toThrow('Required environment variable JWT_SECRET is not set');
    });

    it('should throw error when required DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      const { EnvironmentConfig } = require('../../config/environment.js');
      expect(() => new EnvironmentConfig()).toThrow('Required environment variable DATABASE_URL is not set');
    });
  });

  describe('environment detection methods', () => {
    it('should correctly identify production environment', () => {
      process.env.NODE_ENV = ENVIRONMENT.PRODUCTION;
      const { EnvironmentConfig } = require('../../config/environment.js');
      const testConfig = new EnvironmentConfig();
      expect(testConfig.isProduction()).toBe(true);
      expect(testConfig.isDevelopment()).toBe(false);
    });

    it('should correctly identify development environment', () => {
      process.env.NODE_ENV = ENVIRONMENT.DEVELOPMENT;
      const { EnvironmentConfig } = require('../../config/environment.js');
      const testConfig = new EnvironmentConfig();
      expect(testConfig.isProduction()).toBe(false);
      expect(testConfig.isDevelopment()).toBe(true);
    });

    it('should default to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      const { EnvironmentConfig } = require('../../config/environment.js');
      const testConfig = new EnvironmentConfig();
      expect(testConfig.isDevelopment()).toBe(true);
    });
  });
});