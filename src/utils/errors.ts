/**
 * Custom API error class for standardized error handling
 */
export class ApiError extends Error {
  public statusCode: number;
  public code: string;

  /**
   * Creates a new API error instance
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @param code - Error code identifier
   */
  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
    
    // Maintains proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}