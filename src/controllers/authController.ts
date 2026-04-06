import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserService } from '../services/userService';
import { Logger } from '../utils/logger';
import { sanitize } from '../utils/sanitizer';

const JWT_SECRET = process.env.JWT_SECRET;
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_CREATED = 201;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_CONFLICT = 409;

const userService = new UserService();
const logger = new Logger();

/**
 * Validation rules for user registration
 */
export const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').isLength({ min: 1 }).trim()
];

/**
 * Validation rules for user login
 */
export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

/**
 * Handle user registration endpoint
 * @param req - Express request object
 * @param res - Express response object
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(HTTP_STATUS_BAD_REQUEST).json({ errors: errors.array() });
      return;
    }

    const { email, password, name } = req.body;
    const sanitizedName = sanitize(name);

    const result = await userService.register(email, password, sanitizedName);
    
    if (result.success) {
      logger.info(`User registered successfully: ${email}`);
      res.status(HTTP_STATUS_CREATED).json({ userId: result.userId });
    } else {
      logger.warn(`Registration failed for ${email}: ${result.error}`);
      res.status(HTTP_STATUS_CONFLICT).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(HTTP_STATUS_BAD_REQUEST).json({ error: 'Registration failed' });
  }
};

/**
 * Handle user login endpoint
 * @param req - Express request object
 * @param res - Express response object
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(HTTP_STATUS_BAD_REQUEST).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;
    const result = await userService.login(email, password);
    
    if (result.success && result.token) {
      logger.info(`User logged in successfully: ${email}`);
      res.status(HTTP_STATUS_OK).json({ token: result.token });
    } else {
      logger.warn(`Login failed for ${email}`);
      res.status(HTTP_STATUS_UNAUTHORIZED).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    logger.error('Login error:', error);
    res.status(HTTP_STATUS_UNAUTHORIZED).json({ error: 'Authentication failed' });
  }
};