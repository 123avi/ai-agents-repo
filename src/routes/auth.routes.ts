import { Router } from 'express';
import { login } from '../controllers/auth.controller';
import { validateLoginRequest } from '../middleware/validation.middleware';

/**
 * Authentication routes
 * Handles user authentication endpoints
 */
const router = Router();

/**
 * POST /api/auth/login
 * Authenticates user with email and password
 */
router.post('/login', validateLoginRequest, login);

export default router;