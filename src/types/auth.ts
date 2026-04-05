import { Request } from 'express';

/**
 * User information extracted from JWT token
 */
export interface JWTUser {
  id: string;
  email: string;
}

/**
 * Extended Express Request interface with authenticated user information
 * Used by authentication middleware to attach user data to requests
 */
export interface AuthenticatedRequest extends Request {
  user: JWTUser;
}