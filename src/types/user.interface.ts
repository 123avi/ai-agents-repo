/**
 * User entity interface
 * Represents user data structure from database
 */
export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

/**
 * Login request payload interface
 * Represents expected login request body structure
 */
export interface LoginRequest {
  email: string;
  password: string;
}