/**
 * User creation data interface
 * Defines the structure for creating new user records
 */
export interface CreateUserData {
  /** User's email address - must be unique */
  email: string;
  /** User's hashed password */
  password: string;
  /** User's display name */
  name: string;
}