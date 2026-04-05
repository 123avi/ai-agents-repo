/**
 * User entity type definition
 */
export interface User {
  id: number;
  email: string;
  password?: string;
  created_at: Date;
}

/**
 * User registration request payload
 */
export interface RegisterRequest {
  email: string;
  password: string;
}

/**
 * User login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * JWT token payload
 */
export interface TokenPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}