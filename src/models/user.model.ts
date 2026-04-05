/**
 * User model interface representing database user entity
 */
export interface User {
  /** Unique user identifier */
  id: number;
  
  /** User email address (unique) */
  email: string;
  
  /** Bcrypt hashed password */
  password_hash: string;
  
  /** Account creation timestamp */
  created_at: Date;
  
  /** Last update timestamp */
  updated_at: Date;
}