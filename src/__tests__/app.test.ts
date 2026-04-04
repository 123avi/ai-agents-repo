import request from 'supertest';
import { createApp } from '../app.js';
import { SERVER_CONSTANTS, HTTP_STATUS } from '../constants/server.js';

describe('Express App', () => {
  const app = createApp();

  describe('Health Check Endpoint', () => {
    it('should respond with 200 and health status', async () => {
      const response = await request(app)
        .get(SERVER_CONSTANTS.HEALTH_CHECK_PATH)
        .expect(HTTP_STATUS.OK);

      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          environment: expect.any(String),
          version: expect.any(String),
        })
      );
    });

    it('should have valid timestamp format', async () => {
      const response = await request(app)
        .get(SERVER_CONSTANTS.HEALTH_CHECK_PATH)
        .expect(HTTP_STATUS.OK);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('API Routes', () => {
    it('should respond to API prefix route', async () => {
      const response = await request(app)
        .get(SERVER_CONSTANTS.API_PREFIX)
        .expect(HTTP_STATUS.OK);

      expect(response.body).toEqual({
        message: 'API routes will be implemented here',
      });
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(response.body).toEqual({
        success: false,
        message: 'Route /non-existent-route not found',
      });
    });
  });

  describe('Request Parsing', () => {
    it('should parse JSON request bodies', async () => {
      const testData = { test: 'data' };
      
      await request(app)
        .post(SERVER_CONSTANTS.API_PREFIX)
        .send(testData)
        .set('Content-Type', 'application/json')
        .expect(HTTP_STATUS.OK);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get(SERVER_CONSTANTS.HEALTH_CHECK_PATH)
        .expect(HTTP_STATUS.OK);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });
});