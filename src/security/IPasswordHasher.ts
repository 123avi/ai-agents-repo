/**
 * Password hashing interface for secure password storage
 */
export interface IPasswordHasher {
  /**
   * Hash a plain text password
   * @param password - Plain text password to hash
   * @returns Promise resolving to hashed password
   */
  hash(password: string): Promise<string>;

  /**
   * Verify a plain text password against a hash
   * @param password - Plain text password to verify
   * @param hash - Stored password hash
   * @returns Promise resolving to true if password matches
   */
  verify(password: string, hash: string): Promise<boolean>;
}