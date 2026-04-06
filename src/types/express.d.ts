import { User } from '../models/user.model';

/**
 * Augments Express Request interface to include authenticated user information
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
    }
  }
}

export {};