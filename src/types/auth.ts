import { Request } from 'express';

/**
 * JWT payload interface
 */
export interface JWTPayload {
  id: number;
  email: string;
}

/**
 * Extended Request interface with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}