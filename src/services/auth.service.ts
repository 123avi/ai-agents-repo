import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { promisify } from 'util';

/**
 * User payload interface for JWT tokens
 */
interface UserPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * Token validation result interface
 */
interface TokenValidationResult {
  valid: boolean;
  userId?: string;
  error?: string;
}

/**
 * Authentication service for JWT token operations and password hashing
 */
export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRATION = '24h';
  private readonly SALT_ROUNDS = 10;
  private readonly JWT_ALGORITHM = 'HS256';

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET;
    if (!this.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  /**
   * Generates a JWT token for the given user ID
   * @param userId - The user ID to encode in the token
   * @returns Promise resolving to the JWT token string
   */
  async generateToken(userId: string): Promise<string> {
    try {
      const payload: UserPayload = { userId };
      
      const token = jwt.sign(
        payload,
        this.JWT_SECRET,
        {
          expiresIn: this.JWT_EXPIRATION,
          algorithm: this.JWT_ALGORITHM
        }
      );

      return token;
    } catch (error) {
      console.error('Token generation failed:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Validates a JWT token and returns user ID if valid
   * @param token - The JWT token to validate
   * @returns Promise resolving to validation result with user ID if valid
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      if (!token) {
        return { valid: false, error: 'Token is required' };
      }

      const decoded = jwt.verify(
        token,
        this.JWT_SECRET,
        { algorithms: [this.JWT_ALGORITHM] }
      ) as UserPayload;

      if (!decoded.userId) {
        return { valid: false, error: 'Invalid token payload' };
      }

      return { valid: true, userId: decoded.userId };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token has expired' };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token format' };
      }
      
      console.error('Token validation failed:', error);
      return { valid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Hashes a plain text password using bcrypt
   * @param password - The plain text password to hash
   * @returns Promise resolving to the hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
      return hashedPassword;
    } catch (error) {
      console.error('Password hashing failed:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compares a plain text password with a hashed password
   * @param password - The plain text password
   * @param hashedPassword - The hashed password to compare against
   * @returns Promise resolving to true if passwords match, false otherwise
   */
  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const isMatch = await bcrypt.compare(password, hashedPassword);
      return isMatch;
    } catch (error) {
      console.error('Password comparison failed:', error);
      throw new Error('Failed to compare passwords');
    }
  }
}