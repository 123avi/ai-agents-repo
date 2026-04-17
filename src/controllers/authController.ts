import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Authentication controller handling user registration and login endpoints
 */
export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * Handles user registration
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }

      const userId = await this.authService.register(email, password);
      res.status(201).json({ id: userId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handles user login
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }

      const token = await this.authService.login(email, password);
      res.status(200).json({ token });
    } catch (error) {
      next(error);
    }
  }
}