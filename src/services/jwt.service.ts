import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

/**
 * Token payload interface containing user information
 */
interface TokenPayload {
  user_id: string;
  iat: number;
  exp: number;
}

/**
 * JWT service error class for token-related errors
 */
export class JwtServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'JwtServiceError';
  }
}

/**
 * JWT token service for generating and validating authentication tokens
 */
export class JwtService {
  private readonly SECRET_KEY: string;
  private readonly TOKEN_EXPIRY_HOURS = 24;
  private readonly ALGORITHM = 'HS256';

  constructor() {
    this.SECRET_KEY = this.getSecretKey();
  }

  /**
   * Retrieves JWT secret key from environment variables
   * @returns Secret key for JWT signing
   * @throws JwtServiceError if secret key is not configured
   */
  private getSecretKey(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      const error = new JwtServiceError(
        'JWT_SECRET environment variable is not configured',
        'MISSING_SECRET'
      );
      logger.error('JWT secret key not configured', { error: error.message });
      throw error;
    }
    return secret;
  }

  /**
   * Generates a JWT token for the given user ID with 24-hour expiration
   * @param userId - The user ID to encode in the token
   * @returns Promise resolving to the generated JWT token
   * @throws JwtServiceError if token generation fails
   */
  async generateToken(userId: string): Promise<string> {
    try {
      if (!userId) {
        throw new JwtServiceError('User ID is required for token generation', 'INVALID_USER_ID');
      }

      const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
        user_id: userId
      };

      const options: jwt.SignOptions = {
        algorithm: this.ALGORITHM,
        expiresIn: `${this.TOKEN_EXPIRY_HOURS}h`
      };

      const token = jwt.sign(payload, this.SECRET_KEY, options);
      logger.info('JWT token generated successfully', { userId });
      return token;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during token generation';
      const jwtError = new JwtServiceError(`Token generation failed: ${message}`, 'GENERATION_FAILED');
      logger.error('JWT token generation failed', { userId, error: message });
      throw jwtError;
    }
  }

  /**
   * Verifies and decodes a JWT token, extracting user data
   * @param token - The JWT token to verify
   * @returns Promise resolving to the decoded token payload
   * @throws JwtServiceError if token is invalid, expired, or malformed
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      if (!token) {
        throw new JwtServiceError('Token is required for verification', 'MISSING_TOKEN');
      }

      const decoded = jwt.verify(token, this.SECRET_KEY, {
        algorithms: [this.ALGORITHM]
      }) as TokenPayload;

      logger.info('JWT token verified successfully', { userId: decoded.user_id });
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        const jwtError = new JwtServiceError('Token has expired', 'TOKEN_EXPIRED');
        logger.warn('JWT token expired', { error: error.message });
        throw jwtError;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        const jwtError = new JwtServiceError('Invalid token format', 'INVALID_TOKEN');
        logger.warn('Invalid JWT token', { error: error.message });
        throw jwtError;
      }

      const message = error instanceof Error ? error.message : 'Unknown error during token verification';
      const jwtError = new JwtServiceError(`Token verification failed: ${message}`, 'VERIFICATION_FAILED');
      logger.error('JWT token verification failed', { error: message });
      throw jwtError;
    }
  }
}

/**
 * Default JWT service instance
 */
export const jwtService = new JwtService();