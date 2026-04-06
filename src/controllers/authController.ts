import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserService } from '../services/userService';
import { logger } from '../utils/logger';
import { HTTP_STATUS } from '../constants/httpStatus';
import { ERROR_MESSAGES } from '../constants/errorMessages';

/**
 * Authentication controller handling user registration and login endpoints
 */
export class AuthController {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  /**
   * Validation rules for user registration
   */
  public static registerValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters')
  ];

  /**
   * Validation rules for user login
   */
  public static loginValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ];

  /**
   * Handles user registration
   * @param req - Express request object
   * @param res - Express response object
   */
  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: ERROR_MESSAGES.INVALID_INPUT,
          details: errors.array()
        });
        return;
      }

      const { email, password, name } = req.body;
      
      const result = await this.userService.registerUser(email, password, name);
      
      if (result.exists) {
        res.status(HTTP_STATUS.CONFLICT).json({
          error: ERROR_MESSAGES.EMAIL_ALREADY_EXISTS
        });
        return;
      }

      res.status(HTTP_STATUS.CREATED).json({
        userId: result.userId
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      });
    }
  };

  /**
   * Handles user login
   * @param req - Express request object
   * @param res - Express response object
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: ERROR_MESSAGES.INVALID_INPUT,
          details: errors.array()
        });
        return;
      }

      const { email, password } = req.body;
      
      const result = await this.userService.authenticateUser(email, password);
      
      if (!result.success) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: ERROR_MESSAGES.INVALID_CREDENTIALS
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json({
        token: result.token
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      });
    }
  };
}