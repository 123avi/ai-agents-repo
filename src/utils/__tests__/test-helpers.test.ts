import request from 'supertest';
import { createTestApp } from '../test-helpers';
import { AuthService } from '../../services/auth.service';

// Mock the AuthService
jest.mock('../../services/auth.service');
const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;

/**
 * Unit tests for test helper utilities
 */
describe('Test Helpers', () => {
  describe('createTestApp', () => {
    it('should create Express app with auth routes', () => {
      const app = createTestApp();
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });

    it('should handle JSON parsing middleware', async () => {
      const app = createTestApp();
      
      // Mock the service to avoid actual calls
      const authServiceInstance = {
        register: jest.fn().mockResolvedValue({ id: 1 })
      } as any;
      mockAuthService.mockImplementation(() => authServiceInstance);

      await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect('Content-Type', /json/);
    });

    it('should handle CORS middleware', async () => {
      const app = createTestApp();
      
      const response = await request(app)
        .options('/auth/register')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });
});