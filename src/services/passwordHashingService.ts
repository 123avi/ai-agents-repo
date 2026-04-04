import bcrypt from 'bcrypt';

/**
 * Minimum number of salt rounds for password hashing
 */
const MIN_SALT_ROUNDS = 10;

/**
 * Configuration for password hashing service
 */
interface PasswordHashConfig {
  saltRounds: number;
}

/**
 * Service for secure password hashing and comparison using bcrypt
 */
export class PasswordHashingService {
  private readonly config: PasswordHashConfig;

  /**
   * Creates a new PasswordHashingService instance
   * @param saltRounds - Number of salt rounds (minimum 10, defaults to environment or 12)
   */
  constructor(saltRounds?: number) {
    const envSaltRounds = process.env.BCRYPT_SALT_ROUNDS 
      ? parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) 
      : 12;
    
    const rounds = saltRounds || envSaltRounds;
    
    if (rounds < MIN_SALT_ROUNDS) {
      throw new Error(`Salt rounds must be at least ${MIN_SALT_ROUNDS}`);
    }

    this.config = { saltRounds: rounds };
  }

  /**
   * Hashes a password using bcrypt with configured salt rounds
   * @param password - Plain text password to hash
   * @returns Promise that resolves to the hashed password
   * @throws Error if hashing fails
   */
  async hashPassword(password: string): Promise<string> {
    try {
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      const hashedPassword = await bcrypt.hash(password, this.config.saltRounds);
      return hashedPassword;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown hashing error';
      throw new Error(`Password hashing failed: ${errorMessage}`);
    }
  }

  /**
   * Compares a plain text password with a hashed password
   * @param password - Plain text password to verify
   * @param hashedPassword - Previously hashed password to compare against
   * @returns Promise that resolves to true if passwords match, false otherwise
   * @throws Error if comparison fails
   */
  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      if (!hashedPassword || typeof hashedPassword !== 'string') {
        throw new Error('Hashed password must be a non-empty string');
      }

      const isMatch = await bcrypt.compare(password, hashedPassword);
      return isMatch;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown comparison error';
      throw new Error(`Password comparison failed: ${errorMessage}`);
    }
  }
}