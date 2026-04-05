import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { DatabaseConnection } from '../config/database';

// Initialize dependencies
const userRepository = new UserRepository(DatabaseConnection.getInstance());
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

/**
 * Authentication routes configuration
 */
const authRouter = Router();

/**
 * POST /api/auth/login - User login endpoint
 * Accepts email and password, returns JWT token for valid credentials
 */
authRouter.post('/login', (req, res) => authController.login(req, res));

export { authRouter };