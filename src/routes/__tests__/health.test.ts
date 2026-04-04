import { createHealthRouter } from '../health';
import express from 'express';
import request from 'supertest';

describe('Health Router', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/health', createHealthRouter());
  });

  describe('GET /health', () => {
    it('should return 200 OK with health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return valid timestamp in ISO format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = response.body.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should return numeric uptime', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should set correct content-type header', async () => {
      await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);
    });
  });

  describe('createHealthRouter', () => {
    it('should create router instance', () => {
      const router = createHealthRouter();
      expect(router).toBeDefined();
      expect(typeof router).toBe('function');
    });
  });
});