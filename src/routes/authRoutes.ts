import { Router } from 'express';
import { register, login, registerValidation, loginValidation } from '../controllers/authController';

const router = Router();

/**
 * Authentication routes
 * Handles user registration and login endpoints
 */
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

export default router;