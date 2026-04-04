import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

/**
 * JWT token configuration constants
 */
const TOKEN_EXPIRY = '24h';
const ALGORITHM = 'HS256' as const;

/**
 * JWT payload interface containing user identification
 */
export interface JwtPayload {
  userId: number;
  iat?: number;
  exp?: number;
}

/**
 * Custom error for JWT-related operations
 */
export class JwtError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'JwtError';
  }
}

/**
 * JWT handler class for token generation and validation
 */
export class JwtHandler {
  private readonly secret: string;

  constructor() {
    this.secret = this.getJwtSecret();
  }

  /**
   * Retrieves JWT secret from environment variables
   * @returns JWT secret string
   * @throws Error if JWT_SECRET is not configured
   */
  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      const error = new Error('JWT_SECRET environment variable is required');
      logger.error('JWT secret not configured', { error: error.message });
      throw error;
    }
    return secret;
  }

  /**
   * Generates a JWT token for the specified user ID
   * @param userId - The user ID to include in the token payload
   * @returns Promise resolving to the generated JWT token
   */
  async generateToken(userId: number): Promise<string> {
    try {
      const payload: JwtPayload = { userId };
      const token = jwt.sign(payload, this.secret, {
        algorithm: ALGORITHM,
        expiresIn: TOKEN_EXPIRY
      });
      
      logger.info('JWT token generated', { userId });
      return token;
    } catch (error) {
      logger.error('Failed to generate JWT token', { userId, error });
      throw new JwtError('Token generation failed', 'GENERATION_ERROR');
    }
  }

  /**
   * Validates a JWT token and extracts the user ID
   * @param token - The JWT token to validate
   * @returns Promise resolving to the user ID from the token
   * @throws JwtError for invalid, expired, or malformed tokens
   */
  async validateToken(token: string): Promise<number> {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: [ALGORITHM]
      }) as JwtPayload;

      if (!decoded.userId || typeof decoded.userId !== 'number') {
        throw new JwtError('Invalid token payload', 'INVALID_PAYLOAD');
      }

      logger.info('JWT token validated', { userId: decoded.userId });
      return decoded.userId;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('JWT token expired', { error: error.message });
        throw new JwtError('Token has expired', 'TOKEN_EXPIRED');
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid JWT token', { error: error.message });
        throw new JwtError('Invalid token', 'INVALID_TOKEN');
      }
      
      if (error instanceof JwtError) {
        throw error;
      }
      
      logger.error('Unexpected JWT validation error', { error });
      throw new JwtError('Token validation failed', 'VALIDATION_ERROR');
    }
  }
}