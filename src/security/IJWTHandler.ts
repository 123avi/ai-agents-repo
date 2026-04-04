export interface JWTPayload {
  userId: number;
  email: string;
}

/**
 * JWT handler interface for token operations
 */
export interface IJWTHandler {
  /**
   * Generate a JWT token for authenticated user
   * @param payload - User data to include in token
   * @returns Promise resolving to signed JWT token
   */
  generateToken(payload: JWTPayload): Promise<string>;

  /**
   * Verify and decode a JWT token
   * @param token - JWT token to verify
   * @returns Promise resolving to decoded payload
   */
  verifyToken(token: string): Promise<JWTPayload>;
}