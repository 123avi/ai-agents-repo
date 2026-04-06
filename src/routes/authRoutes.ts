import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { UserService } from '../services/userService';

/**
 * Authentication routes configuration
 * @param userService - User service instance for dependency injection
 * @returns Configured Express router
 */
export function createAuthRoutes(userService: UserService): Router {
  const router = Router();
  const authController = new AuthController(userService);

  /**
   * POST /api/auth/register
   * User registration endpoint
   */
  router.post(
    '/register',
    AuthController.registerValidation,
    authController.register
  );

  /**
   * POST /api/auth/login
   * User login endpoint
   */
  router.post(
    '/login',
    AuthController.loginValidation,
    authController.login
  );

  return router;
}