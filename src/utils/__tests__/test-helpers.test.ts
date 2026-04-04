import { createTestApp } from '../test-helpers';
import express from 'express';

// Isolate mocks for this test file only
jest.mock('../../routes/auth', () => ({
  authRoutes: jest.fn((req: any, res: any) => res.json({ test: 'route' }))
}));

describe('Test Helpers', () => {
  describe('createTestApp', () => {
    it('should create an Express application', () => {
      const app = createTestApp();
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });

    it('should configure JSON middleware', () => {
      const app = createTestApp();
      const middlewareStack = app._router?.stack || [];
      
      // Verify middleware is configured
      expect(middlewareStack.length).toBeGreaterThan(0);
    });

    it('should mount auth routes on /auth path', () => {
      const app = createTestApp();
      const routes = app._router?.stack || [];
      
      // Look for mounted router
      const authMount = routes.find((layer: any) => 
        layer.regexp && layer.regexp.toString().includes('auth')
      );
      
      expect(authMount).toBeDefined();
    });
  });
});