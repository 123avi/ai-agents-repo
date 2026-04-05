import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

/**
 * Authentication controller handling user registration and login endpoints
 */
export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Handles user registration
   * @param req Express request object
   * @param res Express response object
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      if (!this.isValidEmail(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      const result = await this.authService.registerUser(email, password);
      res.status(201).json({ message: 'User registered successfully', userId: result.id });
    } catch (error) {
      logger.error('Registration error:', error);
      
      if (error instanceof Error && error.message === 'Email already exists') {
        res.status(409).json({ error: 'Email already exists' });
        return;
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Handles user login
   * @param req Express request object
   * @param res Express response object
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const token = await this.authService.loginUser(email, password);
      res.status(200).json({ token, message: 'Login successful' });
    } catch (error) {
      logger.error('Login error:', error);
      
      if (error instanceof Error && error.message === 'Invalid credentials') {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Validates email format
   * @param email Email string to validate
   * @returns True if valid email format
   */
  private isValidEmail(email: string): boolean {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return EMAIL_REGEX.test(email);
  }
}