import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserService } from '../services/user.service';
import { PostgresUserRepository } from '../repositories/user.repository';
import { logger } from '../utils/logger';

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * Controller for authentication endpoints
 */
export class AuthController {
  private userService: UserService;

  /**
   * Creates a new AuthController instance with proper dependency injection
   */
  constructor() {
    const userRepository = new PostgresUserRepository();
    this.userService = new UserService(userRepository);
  }

  /**
   * Validation rules for user registration
   */
  static getRegisterValidation() {
    return [
      body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
      body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
    ];
  }

  /**
   * Validation rules for user login
   */
  static getLoginValidation() {
    return [
      body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
      body('password')
        .notEmpty()
        .withMessage('Password is required')
    ];
  }

  /**
   * Handles user registration - POST /api/auth/register
   * @param req - Express request object
   * @param res - Express response object
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid input',
          details: errors.array()
        });
        return;
      }

      const { email, password } = req.body;
      const user = await this.userService.register({ email, password });
      
      res.status(HTTP_STATUS.CREATED).json({
        message: 'User registered successfully',
        userId: user.id
      });
    } catch (error) {
      logger.error('Registration error', { error: error.message });
      
      if (error.message === 'User already exists') {
        res.status(HTTP_STATUS.CONFLICT).json({
          error: 'Email already registered'
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Handles user login - POST /api/auth/login
   * @param req - Express request object
   * @param res - Express response object
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid input',
          details: errors.array()
        });
        return;
      }

      const { email, password } = req.body;
      const loginResponse = await this.userService.login(email, password);
      
      res.status(HTTP_STATUS.OK).json({
        message: 'Login successful',
        token: loginResponse.token,
        user: loginResponse.user
      });
    } catch (error) {
      logger.error('Login error', { error: error.message });
      
      if (error.message === 'Invalid credentials') {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: 'Invalid email or password'
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error'
      });
    }
  }
}