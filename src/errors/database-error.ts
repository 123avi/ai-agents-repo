/**
 * Error thrown when database operations fail
 */
export class DatabaseError extends Error {
  /**
   * Creates a new DatabaseError instance
   * @param message - Error description
   */
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}