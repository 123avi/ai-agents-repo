import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

/**
 * Authentication routes configuration
 */
export function createAuthRoutes(): Router {
  const router = Router();
  const authController = new AuthController();

  /**
   * User registration endpoint
   * POST /api/auth/register
   */
  router.post(
    '/register',
    AuthController.getRegisterValidation(),
    (req, res) => authController.register(req, res)
  );

  /**
   * User login endpoint
   * POST /api/auth/login
   */
  router.post(
    '/login',
    AuthController.getLoginValidation(),
    (req, res) => authController.login(req, res)
  );

  return router;
}