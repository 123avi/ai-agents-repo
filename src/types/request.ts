import { Request } from 'express';

/**
 * Extended Express Request interface with authenticated user information
 */
export interface AuthenticatedRequest extends Request {
  /** User ID extracted from validated JWT token */
  user_id?: string;
}