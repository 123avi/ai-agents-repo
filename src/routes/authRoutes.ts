import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { AuthService } from '../services/authService';

/**
 * Creates and configures authentication routes
 * @returns Express router with auth endpoints
 */
export function createAuthRoutes(): Router {
  const router = Router();
  const authService = new AuthService();
  const authController = new AuthController(authService);

  router.post('/register', (req, res, next) => authController.register(req, res, next));
  router.post('/login', (req, res, next) => authController.login(req, res, next));

  return router;
}