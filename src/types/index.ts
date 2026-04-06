/**
 * Common type definitions for the application
 */

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * User entity structure
 */
export interface User {
  id: number;
  email: string;
  created_at: Date;
}

/**
 * To-do item entity structure
 */
export interface TodoItem {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  due_date?: Date;
  status: 'open' | 'done';
  created_at: Date;
  updated_at: Date;
}

/**
 * Authentication token payload
 */
export interface JwtPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Request with authenticated user context
 */
export interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: number;
    email: string;
  };
}