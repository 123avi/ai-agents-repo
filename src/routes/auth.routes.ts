import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { db } from '../config/database';

const router = Router();

// Initialize dependencies
const userRepository = new UserRepository(db);
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

/**
 * POST /api/auth/register - User registration endpoint
 */
router.post('/register', (req, res) => {
  authController.register(req, res);
});

export { router as authRoutes };