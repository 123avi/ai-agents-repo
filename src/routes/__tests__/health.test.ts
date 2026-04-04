import request from 'supertest';
import express from 'express';
import { createHealthRouter } from '../health';

describe('Health Router', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', createHealthRouter());
  });
  
  describe('GET /health', () => {
    it('should return 200 OK with health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.uptime).toBe('number');
    });
    
    it('should return valid ISO timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
    
    it('should return non-negative uptime', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});