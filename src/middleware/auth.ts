import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const BEARER_PREFIX = 'Bearer ';
const TOKEN_EXPIRED_MESSAGE = 'Token has expired';
const TOKEN_INVALID_MESSAGE = 'Invalid or malformed token';
const TOKEN_MISSING_MESSAGE = 'Authorization token is required';
const SECRET_MISSING_MESSAGE = 'JWT secret not configured';

interface JwtPayload {
  user_id: string;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  user_id?: string;
}

/**
 * Authentication middleware that validates JWT tokens and extracts user information
 * @param req - Express request object
 * @param res - Express response object  
 * @param next - Express next function
 * @returns void
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      res.status(500).json({ error: SECRET_MISSING_MESSAGE });
      return;
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
      res.status(401).json({ error: TOKEN_MISSING_MESSAGE });
      return;
    }

    const token = authHeader.slice(BEARER_PREFIX.length);
    
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    req.user_id = decoded.user_id;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: TOKEN_EXPIRED_MESSAGE });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: TOKEN_INVALID_MESSAGE });
      return;
    }
    
    res.status(401).json({ error: TOKEN_INVALID_MESSAGE });
  }
};