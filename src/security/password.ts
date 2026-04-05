import bcrypt from 'bcrypt';
import { AppLogger } from '../utils/logger';

/** Minimum salt rounds for bcrypt hashing */
const MIN_SALT_ROUNDS = 12;

/** Default salt rounds to use for password hashing */
const DEFAULT_SALT_ROUNDS = 12;

/**
 * Hashes a plain text password using bcrypt with secure salt rounds
 * @param plainPassword - The plain text password to hash
 * @param saltRounds - Number of salt rounds (minimum 12, defaults to 12)
 * @returns Promise that resolves to the hashed password string
 * @throws Error if password is empty or salt rounds are insufficient
 */
export async function hashPassword(
  plainPassword: string,
  saltRounds: number = DEFAULT_SALT_ROUNDS
): Promise<string> {
  try {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (saltRounds < MIN_SALT_ROUNDS) {
      throw new Error(`Salt rounds must be at least ${MIN_SALT_ROUNDS}`);
    }

    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    AppLogger.info('Password hashed successfully', { saltRounds });
    return hashedPassword;
  } catch (error) {
    AppLogger.error('Password hashing failed', { error: error.message });
    throw error;
  }
}

/**
 * Verifies a plain text password against a bcrypt hash
 * @param plainPassword - The plain text password to verify
 * @param hashedPassword - The bcrypt hash to compare against
 * @returns Promise that resolves to true if password matches, false otherwise
 * @throws Error if inputs are invalid or verification fails
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new Error('Hashed password must be a non-empty string');
    }

    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    AppLogger.info('Password verification completed', { isValid });
    return isValid;
  } catch (error) {
    AppLogger.error('Password verification failed', { error: error.message });
    throw error;
  }
}