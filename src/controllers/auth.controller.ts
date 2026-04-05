import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { validateEmail, validatePassword } from '../utils/validation';
import { logger } from '../utils/logger';

interface RegisterRequestBody {
  email: string;
  password: string;
}

interface LoginRequestBody {
  email: string;
  password: string;
}

/**
 * Controller for authentication endpoints
 * Handles user registration and login HTTP requests
 */
export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * Handle POST /api/auth/register requests
   * Creates a new user account with email and password
   * 
   * @param req - Express request with email and password in body
   * @param res - Express response
   * @param next - Express next function for error handling
   */
  public register = async (
    req: Request<{}, {}, RegisterRequestBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Validate request body format
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      if (!validateEmail(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      if (!validatePassword(password)) {
        res.status(400).json({ error: 'Password must be at least 8 characters with uppercase, lowercase, and number' });
        return;
      }

      const result = await this.authService.register(email, password);
      
      if (!result.success) {
        if (result.error === 'EMAIL_EXISTS') {
          res.status(409).json({ error: 'Email already registered' });
          return;
        }
        res.status(500).json({ error: 'Registration failed' });
        return;
      }

      logger.info('User registered successfully', { email });
      res.status(201).json({ message: 'User registered successfully', userId: result.userId });
    } catch (error) {
      logger.error('Registration error', { error, email: req.body?.email });
      next(error);
    }
  };

  /**
   * Handle POST /api/auth/login requests
   * Authenticates user and returns JWT token
   * 
   * @param req - Express request with email and password in body
   * @param res - Express response
   * @param next - Express next function for error handling
   */
  public login = async (
    req: Request<{}, {}, LoginRequestBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Validate request body format
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      if (!validateEmail(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      const result = await this.authService.login(email, password);
      
      if (!result.success) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      logger.info('User logged in successfully', { email });
      res.status(200).json({ 
        message: 'Login successful', 
        token: result.token,
        userId: result.userId
      });
    } catch (error) {
      logger.error('Login error', { error, email: req.body?.email });
      next(error);
    }
  };
}