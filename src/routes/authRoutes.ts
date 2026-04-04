import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authService } from '../services/authService';
import { validateRegistration, validateLogin } from '../middleware/validation';

/**
 * Creates and configures authentication routes
 * @returns Express router with authentication endpoints
 */
export function createAuthRoutes(): Router {
  const router = Router();
  const authController = new AuthController(authService);

  /**
   * POST /auth/register - User registration endpoint
   * Validates email and password, creates new user account
   */
  router.post('/register', validateRegistration, authController.register);

  /**
   * POST /auth/login - User login endpoint
   * Validates credentials and returns JWT token
   */
  router.post('/login', validateLogin, authController.login);

  return router;
}
