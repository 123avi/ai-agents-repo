import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Authentication error types for structured logging
 */
const AUTH_ERRORS = {
  MISSING_TOKEN: 'missing_token',
  INVALID_TOKEN: 'invalid_token',
  EXPIRED_TOKEN: 'expired_token',
  MALFORMED_TOKEN: 'malformed_token',
  INVALID_USER_ID: 'invalid_user_id',
  MISSING_JWT_SECRET: 'missing_jwt_secret'
} as const;

/**
 * Extended Request interface with user_id property
 */
export interface AuthenticatedRequest extends Request {
  user_id: string;
}

/**
 * JWT payload structure
 */
interface JWTPayload {
  user_id: string;
  iat: number;
  exp: number;
}

/**
 * Validates JWT secret configuration
 * @throws Error if JWT_SECRET is not configured
 */
function validateJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SECRET environment variable is not configured');
    throw new Error('JWT authentication is not properly configured');
  }
  return secret;
}

/**
 * Validates user_id from JWT payload
 * @param userId - User ID from JWT payload
 * @returns True if valid, false otherwise
 */
function isValidUserId(userId: any): userId is string {
  return typeof userId === 'string' && userId.trim().length > 0;
}

/**
 * Authentication middleware to validate JWT tokens and extract user information
 * Implements AC-001, AC-002, AC-003, AC-004
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Validate JWT secret configuration
    const jwtSecret = validateJWTSecret();

    // Extract Bearer token from Authorization header (AC-001)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication attempt without valid authorization header', {
        error_type: AUTH_ERRORS.MISSING_TOKEN,
        ip: req.ip,
        path: req.path
      });
      res.status(401).json({ error: 'Authorization token required' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (!token) {
      logger.warn('Authentication attempt with empty token', {
        error_type: AUTH_ERRORS.MISSING_TOKEN,
        ip: req.ip,
        path: req.path
      });
      res.status(401).json({ error: 'Authorization token required' });
      return;
    }

    // Verify JWT token (AC-002, AC-004)
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Validate user_id from token payload
    if (!isValidUserId(decoded.user_id)) {
      logger.warn('Authentication attempt with invalid user_id in token', {
        error_type: AUTH_ERRORS.INVALID_USER_ID,
        ip: req.ip,
        path: req.path
      });
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }

    // Attach user_id to request object (AC-003)
    (req as AuthenticatedRequest).user_id = decoded.user_id;
    next();
  } catch (error) {
    // Handle JWT verification errors (AC-002, AC-004)
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Authentication attempt with expired token', {
        error_type: AUTH_ERRORS.EXPIRED_TOKEN,
        ip: req.ip,
        path: req.path
      });
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Authentication attempt with malformed token', {
        error_type: AUTH_ERRORS.MALFORMED_TOKEN,
        ip: req.ip,
        path: req.path
      });
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Handle JWT secret configuration errors
    if (error instanceof Error && error.message.includes('JWT authentication is not properly configured')) {
      logger.error('JWT secret configuration error during authentication', {
        error_type: AUTH_ERRORS.MISSING_JWT_SECRET
      });
      res.status(500).json({ error: 'Authentication service unavailable' });
      return;
    }

    // Handle unexpected errors
    logger.error('Unexpected error during authentication', {
      error_type: AUTH_ERRORS.INVALID_TOKEN,
      ip: req.ip,
      path: req.path
    });
    res.status(401).json({ error: 'Authentication failed' });
  }
}