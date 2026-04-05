import { Request } from 'express';

/**
 * Extend Express Request interface to include userId property
 * Added by authentication middleware after successful token verification
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}