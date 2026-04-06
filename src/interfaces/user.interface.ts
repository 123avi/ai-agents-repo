/**
 * User interface definitions for type safety across the application
 */
export interface User {
  id: number;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: UserResponse;
}