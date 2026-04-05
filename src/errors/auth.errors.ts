/**
 * Custom error class for authentication failures
 * Provides structured error handling with HTTP status codes
 */
export class AuthenticationError extends Error {
  public readonly statusCode: number;
  
  /**
   * Creates new authentication error
   * @param message - Error message
   * @param statusCode - HTTP status code (default: 401)
   */
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, AuthenticationError);
  }
}