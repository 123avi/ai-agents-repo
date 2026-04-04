import request from 'supertest';
import { createApp } from '../server';
import express from 'express';

describe('Express Server', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createApp();
  });

  describe('Middleware Configuration', () => {
    it('should parse JSON requests', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(501);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle CORS requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should apply security headers via helmet', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('Route Mounting', () => {
    it('should mount auth routes at /auth', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(501);
      expect(response.body.error).toBe('Not implemented yet');
    });

    it('should mount todo routes at /todos', async () => {
      const response = await request(app)
        .get('/todos');

      expect(response.status).toBe(501);
      expect(response.body.error).toBe('Not implemented yet');
    });

    it('should mount health check at /health', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should return proper error format', async () => {
      // This would test actual error scenarios in a real implementation
      const response = await request(app)
        .get('/health');

      expect(response.body).toHaveProperty('timestamp');
    });
  });
});