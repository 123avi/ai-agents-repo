import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { UserRepository } from '../repositories/user.repository';
import { pool } from '../config/database';

/**
 * Creates and configures authentication routes
 * @returns Express router with auth endpoints
 */
export function createAuthRoutes(): Router {
  const router = Router();
  const userRepository = new UserRepository(pool);
  const authController = new AuthController(userRepository);

  /**
   * POST /api/auth/register - User registration endpoint
   */
  router.post('/register', (req, res) => {
    authController.register(req, res).catch(error => {
      console.error('Unhandled error in register route:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });

  return router;
}