import { Router } from 'express';
import { Pool } from 'pg';
import { AuthController } from '../controllers/authController';
import { UserRepository } from '../repositories/userRepository';

/**
 * Creates authentication routes with dependency injection
 * @param pool - PostgreSQL connection pool
 * @returns Express router with auth routes
 */
export function createAuthRoutes(pool: Pool): Router {
  const router = Router();
  const userRepository = new UserRepository(pool);
  const authController = new AuthController(userRepository);

  /**
   * POST /api/auth/login
   * Authenticates user and returns JWT token
   */
  router.post('/login', (req, res) => authController.login(req, res));

  return router;
}