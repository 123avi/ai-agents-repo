import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  userId?: number;
}

interface JwtPayload {
  userId: number;
  iat: number;
  exp: number;
}

const BEARER_PREFIX = 'Bearer ';
const MISSING_TOKEN_ERROR = 'Access token is required';
const INVALID_TOKEN_ERROR = 'Invalid or expired token';
const JWT_SECRET_KEY = process.env.JWT_SECRET;

if (!JWT_SECRET_KEY) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Express middleware to validate JWT tokens and extract user ID for protected routes.
 * Extracts Bearer token from Authorization header, validates it, and adds userId to request.
 * Returns 401 for missing or invalid tokens.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
      res.status(401).json({ error: MISSING_TOKEN_ERROR });
      return;
    }

    const token = authHeader.substring(BEARER_PREFIX.length);
    
    const decoded = jwt.verify(token, JWT_SECRET_KEY) as JwtPayload;
    
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError || 
        error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: INVALID_TOKEN_ERROR });
      return;
    }
    
    console.error('Authentication middleware error:', error);
    res.status(401).json({ error: INVALID_TOKEN_ERROR });
  }
};