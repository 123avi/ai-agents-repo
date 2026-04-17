/**
 * Error thrown when authentication fails
 * Used for 401 Unauthorized responses
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
