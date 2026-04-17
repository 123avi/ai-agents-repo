import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

/**
 * Input validation schema for authentication endpoints
 */
interface AuthRequestBody {
  email: string;
  password: string;
}

/**
 * Validates authentication request body
 * @param body - Request body to validate
 * @returns true if valid, false otherwise
 */
function isValidAuthBody(body: any): body is AuthRequestBody {
  return (
    body &&
    typeof body.email === 'string' &&
    body.email.trim().length > 0 &&
    typeof body.password === 'string' &&
    body.password.trim().length > 0
  );
}

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * Handles user registration
   * @param req - Express request object
   * @param res - Express response object
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      if (!isValidAuthBody(req.body)) {
        res.status(400).json({ error: 'Valid email and password are required' });
        return;
      }

      const { email, password } = req.body;
      const userId = await this.authService.register(email, password);
      
      res.status(201).json({ id: userId });
    } catch (error) {
      logger.error('Registration error:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }
      
      res.status(400).json({ error: 'Registration failed' });
    }
  }

  /**
   * Handles user login
   * @param req - Express request object
   * @param res - Express response object
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      if (!isValidAuthBody(req.body)) {
        res.status(400).json({ error: 'Valid email and password are required' });
        return;
      }

      const { email, password } = req.body;
      const token = await this.authService.login(email, password);
      
      res.status(200).json({ token });
    } catch (error) {
      logger.error('Login error:', error);
      
      if (error instanceof Error && error.message.includes('Invalid credentials')) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
}