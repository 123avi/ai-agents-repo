import { config, isProduction, isDevelopment } from '../environment';

describe('Environment Configuration', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });
  
  describe('config object', () => {
    it('should have default values when environment variables are not set', () => {
      delete process.env.PORT;
      delete process.env.NODE_ENV;
      delete process.env.API_VERSION;
      delete process.env.CORS_ORIGIN;
      
      const { config: testConfig } = require('../environment');
      
      expect(testConfig.port).toBe(3000);
      expect(testConfig.nodeEnv).toBe('development');
      expect(testConfig.apiVersion).toBe('v1');
      expect(testConfig.corsOrigin).toBe('*');
    });
    
    it('should use environment variables when provided', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'production';
      process.env.API_VERSION = 'v2';
      process.env.CORS_ORIGIN = 'https://example.com';
      
      const { config: testConfig } = require('../environment');
      
      expect(testConfig.port).toBe(8080);
      expect(testConfig.nodeEnv).toBe('production');
      expect(testConfig.apiVersion).toBe('v2');
      expect(testConfig.corsOrigin).toBe('https://example.com');
    });
    
    it('should handle invalid port values', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      process.env.PORT = 'invalid';
      const { config: testConfig } = require('../environment');
      
      expect(testConfig.port).toBe(3000);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid PORT value: invalid. Using default: 3000'
      );
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('isProduction', () => {
    it('should return true when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      const { isProduction: testIsProduction } = require('../environment');
      
      expect(testIsProduction()).toBe(true);
    });
    
    it('should return false when NODE_ENV is not production', () => {
      process.env.NODE_ENV = 'development';
      const { isProduction: testIsProduction } = require('../environment');
      
      expect(testIsProduction()).toBe(false);
    });
  });
  
  describe('isDevelopment', () => {
    it('should return true when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      const { isDevelopment: testIsDevelopment } = require('../environment');
      
      expect(testIsDevelopment()).toBe(true);
    });
    
    it('should return false when NODE_ENV is not development', () => {
      process.env.NODE_ENV = 'production';
      const { isDevelopment: testIsDevelopment } = require('../environment');
      
      expect(testIsDevelopment()).toBe(false);
    });
  });
});