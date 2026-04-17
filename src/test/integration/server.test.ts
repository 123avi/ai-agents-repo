import request from 'supertest';
import { Server } from 'http';
import app from '../../app';

const PORT = 3001;

describe('Express Server Integration Tests', () => {
  let server: Server;

  beforeAll((done) => {
    server = app.listen(PORT, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Server Startup and Shutdown', () => {
    it('should start server successfully', (done) => {
      expect(server).toBeDefined();
      expect(server.listening).toBe(true);
      done();
    });

    it('should handle graceful shutdown', (done) => {
      const testServer = app.listen(3002);
      testServer.close((err) => {
        expect(err).toBeUndefined();
        done();
      });
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers on cross-origin requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.status).toBe(204);
    });

    it('should handle GET request with CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Security Headers from Helmet', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-download-options']).toBe('noopen');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should not expose server information', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
    });
  });

  describe('Health Endpoint', () => {
    it('should respond with 200 status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'healthy' });
    });

    it('should respond quickly', async () => {
      const startTime = Date.now();
      await request(app).get('/health');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Global Error Handling', () => {
    it('should handle 404 errors for non-existent routes', async () => {
      const response = await request(app).get('/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Not Found' });
    });

    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should handle internal server errors gracefully', async () => {
      const response = await request(app).get('/test-error');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal Server Error' });
    });

    it('should not leak error details in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app).get('/test-error');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal Server Error');
      expect(response.body.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Middleware Order', () => {
    it('should apply security headers before route handlers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.status).toBe(200);
    });

    it('should apply CORS before route handlers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.status).toBe(200);
    });
  });

  describe('Content-Type Handling', () => {
    it('should handle JSON requests properly', async () => {
      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send({ email: 'test@example.com', password: 'password123' });

      expect([201, 400]).toContain(response.status);
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should reject non-JSON content types for JSON endpoints', async () => {
      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'text/plain')
        .send('not json');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Content-Type');
    });
  });
});