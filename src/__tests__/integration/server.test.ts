import request from 'supertest';
import { Server } from 'http';
import { Express } from 'express';
import { createApp } from '../../app';
import { setupTestEnvironment } from '../setup';
import crypto from 'crypto';

/**
 * Integration tests for Express server with all middleware and routes.
 * Tests complete server lifecycle, middleware chain, and error handling.
 */
describe('Express Server Integration', () => {
  let app: Express;
  let server: Server;
  let originalNodeEnv: string | undefined;
  
  const TEST_PORT = 0; // Use random available port
  const RESPONSE_TIME_THRESHOLD_MS = 200;
  const TEST_JWT_SECRET = crypto.randomBytes(32).toString('hex');

  beforeAll(async () => {
    try {
      await setupTestEnvironment();
      
      // Set test-specific JWT secret
      process.env.JWT_SECRET = TEST_JWT_SECRET;
      
      app = createApp();
      
      // Start server with error handling
      server = await new Promise<Server>((resolve, reject) => {
        const srv = app.listen(TEST_PORT, (err?: Error) => {
          if (err) {
            reject(new Error(`Failed to start test server: ${err.message}`));
          } else {
            resolve(srv);
          }
        });
        
        srv.on('error', (error) => {
          reject(new Error(`Server error during startup: ${error.message}`));
        });
      });
    } catch (error) {
      throw new Error(`Test setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  afterAll(async () => {
    try {
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err) {
              reject(new Error(`Failed to close test server: ${err.message}`));
            } else {
              resolve();
            }
          });
        });
      }
    } catch (error) {
      throw new Error(`Test teardown failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  describe('AC-001: Server startup and shutdown', () => {
    it('should start server successfully', () => {
      expect(server).toBeDefined();
      expect(server.listening).toBe(true);
    });

    it('should handle requests when running', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toEqual({ status: 'healthy' });
    });
  });

  describe('AC-002: CORS headers on cross-origin requests', () => {
    it('should include CORS headers for cross-origin requests', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('AC-003: Security headers from Helmet middleware', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should remove server information header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('AC-004: Health endpoint responds with 200', () => {
    it('should respond with 200 and health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'healthy' });
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should respond within acceptable time threshold', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(RESPONSE_TIME_THRESHOLD_MS);
    });
  });

  describe('AC-005: Global error handling middleware', () => {
    beforeEach(() => {
      originalNodeEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('should handle 404 errors for unknown routes', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Not Found');
    });

    it('should handle server errors without exposing stack traces in production', async () => {
      process.env.NODE_ENV = 'production';
      
      // Mock an error by making a request that will trigger error middleware
      const mockError = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      // Add temporary error route for testing
      app.get('/test-error', mockError);
      
      const response = await request(app)
        .get('/test-error')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Internal Server Error');
      expect(response.body).not.toHaveProperty('stack');
    });

    it('should include stack traces in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      // Mock an error by making a request that will trigger error middleware
      const testError = new Error('Development test error');
      const mockError = jest.fn().mockImplementation(() => {
        throw testError;
      });
      
      // Add temporary error route for testing
      app.get('/test-error-dev', mockError);
      
      const response = await request(app)
        .get('/test-error-dev')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Development test error');
      expect(response.body).toHaveProperty('stack');
    });

    it('should log errors when they occur', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockError = jest.fn().mockImplementation(() => {
        throw new Error('Logged error test');
      });
      
      app.get('/test-error-logging', mockError);
      
      await request(app)
        .get('/test-error-logging')
        .expect(500);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});