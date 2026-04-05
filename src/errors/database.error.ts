/**
 * Custom error class for database-related errors.
 * Provides consistent error handling for data layer operations.
 */
export class DatabaseError extends Error {
  public readonly name = 'DatabaseError';
  public readonly isOperational = true;

  /**
   * Creates a new DatabaseError instance.
   * @param message - Error message describing the database issue
   * @param cause - Optional underlying error that caused this database error
   */
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    
    // Maintains proper stack trace for where error was thrown (Node.js only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }
}