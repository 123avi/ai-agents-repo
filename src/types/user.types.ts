/**
 * User entity representing a registered user account.
 */
export interface User {
  /** Unique user identifier */
  id: number;
  /** User's email address (unique) */
  email: string;
  /** Account creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
}