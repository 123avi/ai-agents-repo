import { Request } from 'express';

/**
 * Interface for authenticated user data
 */
export interface User {
  id: string;
  email: string;
}

/**
 * Extended Express Request interface with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: User;
}