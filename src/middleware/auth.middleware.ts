import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET;
const BEARER_PREFIX = 'Bearer ';
const UNAUTHORIZED_STATUS = 401;
const INVALID_TOKEN_MESSAGE = 'Invalid or expired token';
const MISSING_SECRET_MESSAGE = 'JWT_SECRET environment variable is required';
const MISSING_TOKEN_MESSAGE = 'Authorization token required';

/**
 * Extended Request interface to include user context
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * JWT payload interface
 */
interface JWTPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Extracts JWT token from Authorization header
 * @param authHeader - The Authorization header value
 * @returns The JWT token or null if not found
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return authHeader.substring(BEARER_PREFIX.length);
}

/**
 * Validates JWT token and extracts payload
 * @param token - The JWT token to validate
 * @returns The decoded payload or null if invalid
 */
function validateToken(token: string): JWTPayload | null {
  if (!JWT_SECRET) {
    logger.error(MISSING_SECRET_MESSAGE);
    throw new Error(MISSING_SECRET_MESSAGE);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    logger.warn('JWT validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
}

/**
 * JWT authentication middleware
 * Validates JWT tokens and adds user context to request
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      logger.warn('Authentication failed: missing token', { ip: req.ip });
      res.status(UNAUTHORIZED_STATUS).json({ 
        error: MISSING_TOKEN_MESSAGE 
      });
      return;
    }

    const payload = validateToken(token);
    
    if (!payload) {
      logger.warn('Authentication failed: invalid token', { ip: req.ip });
      res.status(UNAUTHORIZED_STATUS).json({ 
        error: INVALID_TOKEN_MESSAGE 
      });
      return;
    }

    req.user = {
      id: payload.id,
      email: payload.email
    };

    logger.debug('Authentication successful', { userId: payload.id });
    next();
  } catch (error) {
    logger.error('Authentication middleware error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(UNAUTHORIZED_STATUS).json({ 
      error: INVALID_TOKEN_MESSAGE 
    });
  }
}