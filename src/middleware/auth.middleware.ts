import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

/**
 * JWT payload interface for type safety
 */
interface JWTPayload {
  userId: number;
  iat: number;
  exp: number;
}

/**
 * Extended request interface to include authenticated user ID
 */
export interface AuthenticatedRequest extends Request {
  userId: number;
}

/**
 * JWT secret from environment variables
 */
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Middleware to validate JWT tokens and extract user ID
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
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    (req as AuthenticatedRequest).userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    console.error('JWT authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};