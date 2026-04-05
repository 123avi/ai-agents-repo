import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET;
const UNAUTHORIZED_STATUS = 401;
const TOKEN_PREFIX = 'Bearer ';

/**
 * Extended Request interface that includes authenticated user data
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

/**
 * Middleware to authenticate JWT tokens and add user data to request
 * @param req - Express request object
 * @param res - Express response object  
 * @param next - Express next function
 */
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith(TOKEN_PREFIX)) {
      logger.warn('Missing or invalid authorization header');
      res.status(UNAUTHORIZED_STATUS).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required'
        }
      });
      return;
    }

    const token = authHeader.substring(TOKEN_PREFIX.length);
    
    if (!JWT_SECRET) {
      logger.error('JWT_SECRET environment variable not configured');
      throw new Error('Server configuration error');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Token validation failed:', error);
    res.status(UNAUTHORIZED_STATUS).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
  }
};