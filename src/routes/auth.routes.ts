import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';

/**
 * Creates and configures authentication routes
 * @param userRepository - User repository instance
 * @returns Configured Express router
 */
export function createAuthRoutes(userRepository: UserRepository): Router {
  const router = Router();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  router.post('/register', (req, res) => authController.register(req, res));
  router.post('/login', (req, res) => authController.login(req, res));

  return router;
}