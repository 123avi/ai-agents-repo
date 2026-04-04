import jwt, { JwtPayload } from 'jsonwebtoken';

/**
 * JWT token expiration time in hours
 */
const TOKEN_EXPIRATION_HOURS = 24;

/**
 * User payload interface for JWT tokens
 */
export interface UserTokenPayload {
  userId: number;
  email: string;
}

/**
 * Verified token payload interface
 */
export interface VerifiedTokenPayload extends UserTokenPayload, JwtPayload {
  iat: number;
  exp: number;
}

/**
 * JWT Handler for token generation and validation
 */
export class JwtHandler {
  private readonly secret: string;

  /**
   * Initialize JWT handler with secret
   * @param secret - JWT secret key from environment
   */
  constructor(secret: string) {
    if (!secret) {
      throw new Error('JWT secret is required');
    }
    this.secret = secret;
  }

  /**
   * Generate JWT token for user
   * @param payload - User data to encode in token
   * @returns JWT token string
   * @throws Error if token generation fails
   */
  generateToken(payload: UserTokenPayload): string {
    try {
      return jwt.sign(
        payload,
        this.secret,
        { expiresIn: `${TOKEN_EXPIRATION_HOURS}h` }
      );
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Validate and decode JWT token
   * @param token - JWT token string
   * @returns Decoded token payload
   * @throws Error if token is invalid or expired
   */
  validateToken(token: string): VerifiedTokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as VerifiedTokenPayload;
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token format');
      }
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  /**
   * Extract user ID from valid token
   * @param token - JWT token string
   * @returns User ID from token payload
   * @throws Error if token is invalid
   */
  extractUserId(token: string): number {
    const payload = this.validateToken(token);
    return payload.userId;
  }
}