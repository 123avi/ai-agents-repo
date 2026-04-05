import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRegistration, validateLogin } from '../middleware/validation.middleware';

const router = express.Router();
const authController = new AuthController();

/**
 * POST /api/auth/register
 * User registration endpoint
 */
router.post('/register', validateRegistration, authController.register.bind(authController));

/**
 * POST /api/auth/login
 * User login endpoint
 */
router.post('/login', validateLogin, authController.login.bind(authController));

export default router;