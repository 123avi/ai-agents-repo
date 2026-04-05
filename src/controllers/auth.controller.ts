import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { validateEmail, validatePassword } from '../utils/validation';
import { logger } from '../utils/logger';

export interface RegisterRequest {
  email: string;
  password: string;
}

/**
 * Auth controller handling user registration and authentication endpoints
 */
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Handles user registration via POST /api/auth/register
   * @param req Express request containing email and password
   * @param res Express response
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as RegisterRequest;

      // Validate input format
      if (!this.isValidInput(email, password)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid email format or password requirements not met'
          }
        });
        return;
      }

      // Attempt user registration
      const userId = await this.authService.registerUser(email, password);

      res.status(201).json({
        success: true,
        data: { userId }
      });
    } catch (error: any) {
      logger.error('Registration error:', error);
      
      if (error.message === 'Email already exists') {
        res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists'
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Registration failed'
        }
      });
    }
  }

  /**
   * Validates registration input format
   * @param email User email address
   * @param password User password
   * @returns true if input is valid
   */
  private isValidInput(email: string, password: string): boolean {
    return validateEmail(email) && validatePassword(password);
  }
}