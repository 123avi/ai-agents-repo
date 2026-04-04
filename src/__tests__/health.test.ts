import request from 'supertest';
import express from 'express';
import { healthRouter } from '../routes/health';

describe('Health Router', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/health', healthRouter);
  });

  describe('GET /health', () => {
    it('should return healthy status with proper structure', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });

    it('should return valid timestamp format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should return numeric uptime', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return environment information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.environment).toMatch(/^(development|test|production)$/);
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock process.uptime to throw an error
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Mock error');
      });

      jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('error', 'Health check failed');

      // Restore original function
      process.uptime = originalUptime;
      jest.restoreAllMocks();
    });
  });
});