import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { ValidationError } from '../errors/ValidationError';
import { AuthenticationError } from '../errors/AuthenticationError';
import { logger } from '../utils/logger';

/**
 * HTTP status codes for authentication responses
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401
} as const;

/**
 * Authentication controller handling user registration and login
 */
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Handles user registration requests
   * @param req - Express request object containing email and password
   * @param res - Express response object
   * @param next - Express next function for error handling
   */
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      
      const userId = await this.authService.register(email, password);
      
      res.status(HTTP_STATUS.CREATED).json({ id: userId });
      logger.info(`User registered successfully with ID: ${userId}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
        return;
      }
      logger.error('Registration error:', error);
      next(error);
    }
  };

  /**
   * Handles user login requests
   * @param req - Express request object containing email and password
   * @param res - Express response object
   * @param next - Express next function for error handling
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      
      const token = await this.authService.login(email, password);
      
      res.status(HTTP_STATUS.OK).json({ token });
      logger.info(`User logged in successfully: ${email}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
        return;
      }
      if (error instanceof AuthenticationError) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: error.message });
        return;
      }
      logger.error('Login error:', error);
      next(error);
    }
  };
}
