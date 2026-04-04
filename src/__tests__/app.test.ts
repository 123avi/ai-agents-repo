import { createApp, getPort, getHost, HTTP_STATUS } from '../app';
import request from 'supertest';

describe('App Configuration', () => {
  describe('createApp', () => {
    it('should create Express application instance', () => {
      const app = createApp();
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });

    it('should configure health check endpoint', async () => {
      const app = createApp();
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should handle JSON requests', async () => {
      const app = createApp();
      await request(app)
        .post('/api/health')
        .send({ test: 'data' })
        .expect(404); // POST not implemented, but JSON parsing should work
    });
  });

  describe('getPort', () => {
    const originalPort = process.env.PORT;

    afterEach(() => {
      if (originalPort !== undefined) {
        process.env.PORT = originalPort;
      } else {
        delete process.env.PORT;
      }
    });

    it('should return default port when PORT env is not set', () => {
      delete process.env.PORT;
      expect(getPort()).toBe(3000);
    });

    it('should return PORT env variable when set', () => {
      process.env.PORT = '8080';
      expect(getPort()).toBe(8080);
    });

    it('should parse PORT as integer', () => {
      process.env.PORT = '9000';
      expect(getPort()).toBe(9000);
      expect(typeof getPort()).toBe('number');
    });
  });

  describe('getHost', () => {
    const originalHost = process.env.HOST;

    afterEach(() => {
      if (originalHost !== undefined) {
        process.env.HOST = originalHost;
      } else {
        delete process.env.HOST;
      }
    });

    it('should return default host when HOST env is not set', () => {
      delete process.env.HOST;
      expect(getHost()).toBe('0.0.0.0');
    });

    it('should return HOST env variable when set', () => {
      process.env.HOST = 'localhost';
      expect(getHost()).toBe('localhost');
    });
  });

  describe('HTTP_STATUS', () => {
    it('should export HTTP status constants', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });
});