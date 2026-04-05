import { Request, Response, NextFunction } from 'express';
import { LoginRequest } from '../types/user.interface';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validates login request payload
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function validateLoginRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const { email, password }: LoginRequest = req.body;
    
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        }
      });
      return;
    }
    
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format'
        }
      });
      return;
    }
    
    if (password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
        }
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Validation middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
}