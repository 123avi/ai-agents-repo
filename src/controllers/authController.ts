import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { Logger } from '../utils/Logger';
import { validateRegisterInput, validateLoginInput } from '../middleware/validation';

const RESPONSE_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  INTERNAL_ERROR: 500
} as const;

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_EXISTS: 'Email already exists',
  REGISTRATION_FAILED: 'Registration failed',
  LOGIN_FAILED: 'Login failed',
  INTERNAL_ERROR: 'Internal server error'
} as const;

/**
 * Controller for handling authentication-related HTTP requests.
 * Provides endpoints for user registration and login.
 */
export class AuthController {
  private authService: AuthService;

  /**
   * Creates an instance of AuthController.
   * @param authService - The authentication service instance
   */
  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * Handles user registration requests.
   * @param req - Express request object with email and password in body
   * @param res - Express response object
   * @returns Promise<Response> - 201 with user ID or 400/500 with error
   */
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const validation = validateRegisterInput(req.body);
      if (!validation.isValid) {
        Logger.warn('Registration validation failed', { errors: validation.errors });
        return res.status(RESPONSE_CODES.BAD_REQUEST).json({ error: validation.errors.join(', ') });
      }

      const { email, password } = req.body;
      const userId = await this.authService.register(email, password);
      
      Logger.info('User registered successfully', { userId, email });
      return res.status(RESPONSE_CODES.CREATED).json({ id: userId });
    } catch (error) {
      return this.handleAuthError(error, res, 'Registration');
    }
  }

  /**
   * Handles user login requests.
   * @param req - Express request object with email and password in body
   * @param res - Express response object
   * @returns Promise<Response> - 200 with JWT token or 400/401/500 with error
   */
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const validation = validateLoginInput(req.body);
      if (!validation.isValid) {
        Logger.warn('Login validation failed', { errors: validation.errors });
        return res.status(RESPONSE_CODES.BAD_REQUEST).json({ error: validation.errors.join(', ') });
      }

      const { email, password } = req.body;
      const token = await this.authService.login(email, password);
      
      Logger.info('User logged in successfully', { email });
      return res.status(RESPONSE_CODES.SUCCESS).json({ token });
    } catch (error) {
      return this.handleAuthError(error, res, 'Login');
    }
  }

  /**
   * Handles authentication-related errors and sends appropriate responses.
   * @param error - The caught error
   * @param res - Express response object
   * @param operation - The operation that failed (Registration or Login)
   * @returns Response with appropriate status code and error message
   */
  private handleAuthError(error: unknown, res: Response, operation: string): Response {
    Logger.error(`${operation} error`, { error });

    if (error instanceof Error) {
      switch (error.message) {
        case 'Email already exists':
          return res.status(RESPONSE_CODES.BAD_REQUEST).json({ error: ERROR_MESSAGES.EMAIL_EXISTS });
        case 'Invalid credentials':
          return res.status(RESPONSE_CODES.UNAUTHORIZED).json({ error: ERROR_MESSAGES.INVALID_CREDENTIALS });
        default:
          break;
      }
    }

    const errorMessage = operation === 'Registration' ? ERROR_MESSAGES.REGISTRATION_FAILED : ERROR_MESSAGES.LOGIN_FAILED;
    return res.status(RESPONSE_CODES.INTERNAL_ERROR).json({ error: errorMessage });
  }
}