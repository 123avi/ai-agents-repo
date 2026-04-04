import bcrypt from 'bcrypt';

/**
 * Service for handling password hashing operations using bcrypt.
 * Provides methods for hashing passwords and comparing hashed passwords.
 */
export class HashService {
  /**
   * Hashes a plain text password using bcrypt.
   * @param password - Plain text password to hash
   * @param saltRounds - Number of salt rounds for bcrypt
   * @returns Promise<string> - Hashed password
   */
  async hash(password: string, saltRounds: number): Promise<string> {
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compares a plain text password with a hashed password.
   * @param password - Plain text password to compare
   * @param hashedPassword - Hashed password to compare against
   * @returns Promise<boolean> - True if passwords match, false otherwise
   */
  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}