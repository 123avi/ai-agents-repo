/**
 * Error thrown when request validation fails
 * Used for 400 Bad Request responses
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
