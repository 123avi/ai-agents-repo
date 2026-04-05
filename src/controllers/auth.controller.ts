import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth.service';
import { validateLoginRequest } from '../validators/auth.validator';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

// JWT expiration time (24 hours)
const JWT_EXPIRES_IN = '24h';
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Authentication controller handling login and token generation
 */
export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * Handles user login request with credential validation
   * @param req - Express request object with email/password
   * @param res - Express response object
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = validateLoginRequest(req.body);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationResult.errors.join(', ')
          }
        });
        return;
      }

      const { email, password } = req.body;
      
      // Find user by email
      const user = await this.authService.findUserByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
        return;
      }

      // Validate password against stored hash
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
        return;
      }

      // Generate JWT token
      const token = this.generateJwtToken(user.id, user.email);

      res.status(200).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email
          }
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  /**
   * Generates JWT token with user payload and 24-hour expiration
   * @param userId - User ID to include in token
   * @param email - User email to include in token
   * @returns JWT token string
   */
  private generateJwtToken(userId: number, email: string): string {
    if (!JWT_SECRET) {
      throw new ApiError('JWT_SECRET environment variable is not set', 500);
    }

    return jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }
}