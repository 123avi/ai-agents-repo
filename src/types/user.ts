/**
 * Data required to create a new user
 */
export interface CreateUserData {
  email: string;
  passwordHash: string;
}