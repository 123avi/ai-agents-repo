import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication service providing password hashing, JWT generation, and credential verification
 */
export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly TOKEN_EXPIRY = '24h';
  private static readonly MIN_PASSWORD_LENGTH = 8;
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Hashes a password using bcrypt with minimum 12 salt rounds
   * @param password - Plain text password to hash
   * @returns Promise resolving to hashed password
   * @throws Error if hashing fails
   */
  public static async hashPassword(password: string): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
      logger.info('Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      logger.error('Password hashing failed', { error: error.message });
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verifies a password against stored hash
   * @param password - Plain text password to verify
   * @param hashedPassword - Stored password hash
   * @returns Promise resolving to true if password matches
   */
  public static async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hashedPassword);
      logger.info('Password verification completed', { isValid });
      return isValid;
    } catch (error) {
      logger.error('Password verification failed', { error: error.message });
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Generates JWT token with 24-hour expiration
   * @param payload - Token payload data
   * @returns JWT token string
   * @throws Error if token generation fails
   */
  public static generateToken(payload: object): string {
    try {
      if (!config.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable not configured');
      }

      const token = jwt.sign(payload, config.JWT_SECRET, {
        expiresIn: this.TOKEN_EXPIRY,
        algorithm: 'HS256'
      });
      
      logger.info('JWT token generated successfully');
      return token;
    } catch (error) {
      logger.error('JWT token generation failed', { error: error.message });
      throw new Error('Failed to generate token');
    }
  }

  /**
   * Validates JWT token
   * @param token - JWT token to validate
   * @returns Decoded token payload
   * @throws Error if token is invalid or expired
   */
  public static verifyToken(token: string): any {
    try {
      if (!config.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable not configured');
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      logger.info('JWT token verified successfully');
      return decoded;
    } catch (error) {
      logger.error('JWT token verification failed', { error: error.message });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Validates email format using RFC-compliant regex
   * @param email - Email address to validate
   * @returns True if email format is valid
   */
  public static validateEmail(email: string): boolean {
    const isValid = this.EMAIL_REGEX.test(email);
    logger.info('Email validation completed', { email, isValid });
    return isValid;
  }

  /**
   * Validates password strength with minimum 8 characters
   * @param password - Password to validate
   * @returns True if password meets strength requirements
   */
  public static validatePasswordStrength(password: string): boolean {
    const isValid = password && password.length >= this.MIN_PASSWORD_LENGTH;
    logger.info('Password strength validation completed', { 
      length: password?.length || 0, 
      isValid 
    });
    return isValid;
  }
}