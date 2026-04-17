/**
 * Error thrown when resource conflicts occur (e.g., duplicate email)
 */
export class ConflictError extends Error {
  /**
   * Creates a new ConflictError instance
   * @param message - Error description
   */
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}