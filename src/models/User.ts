/**
 * User model representing the users table structure
 */
export interface User {
  id: number;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}