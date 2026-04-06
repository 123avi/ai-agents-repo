import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const AUTHENTICATION_FAILED_MESSAGE = 'Authentication required';

/**
 * Extended request interface with user ID
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Extracts JWT token from Authorization header
 * @param authHeader - The Authorization header value
 * @returns The token string or null if invalid format
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  return token.trim() || null;
}

/**
 * Sends standardized authentication error response
 * @param res - Express response object
 * @param error - Optional error for logging
 */
function sendAuthError(res: Response, error?: any): void {
  if (error) {
    // Structured error logging would go here (logger.error)
    // For now, maintaining minimal logging without console.error
  }
  
  res.status(401).json({ error: AUTHENTICATION_FAILED_MESSAGE });
}

/**
 * JWT authentication middleware
 * Validates JWT tokens and extracts user ID from requests
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      return sendAuthError(res);
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return sendAuthError(res, error);
  }
}