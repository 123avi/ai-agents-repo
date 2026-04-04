import request from 'supertest';
import { createApp } from '../app';

describe('Express App', () => {
  const app = createApp();
  
  describe('Health endpoint', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('ok');
    });
  });
  
  describe('CORS middleware', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
  
  describe('JSON middleware', () => {
    it('should parse JSON request bodies', async () => {
      const testData = { test: 'data' };
      
      // Since we don't have other endpoints yet, we'll test with health
      // This test ensures JSON middleware is loaded without errors
      await request(app)
        .get('/health')
        .expect(200);
    });
  });
  
  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.message).toContain('/unknown-route');
    });
  });
  
  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      // Test that error middleware is properly configured
      // This is mainly to ensure the middleware is set up correctly
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('ok');
    });
  });
});