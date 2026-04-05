import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/request';

const ERROR_MESSAGES = {
  TOKEN_MISSING: 'Authorization token is required',
  TOKEN_INVALID: 'Invalid or expired token',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_MALFORMED: 'Malformed authorization header'
} as const;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Authentication middleware that validates JWT tokens and extracts user information
 * @param req - Express request object
 * @param res - Express response object  
 * @param next - Express next function
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ error: ERROR_MESSAGES.TOKEN_MISSING });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: ERROR_MESSAGES.TOKEN_MALFORMED });
      return;
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    if (!decoded.user_id) {
      res.status(401).json({ error: ERROR_MESSAGES.TOKEN_INVALID });
      return;
    }

    (req as AuthenticatedRequest).user_id = decoded.user_id;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: ERROR_MESSAGES.TOKEN_EXPIRED });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: ERROR_MESSAGES.TOKEN_INVALID });
    } else {
      console.error('Authentication error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};