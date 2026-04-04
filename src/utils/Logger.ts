/**
 * Simple logger interface for database operations and testing.
 * Provides structured logging with different severity levels.
 */
export interface Logger {
  /**
   * Logs informational messages.
   * @param message - Log message
   * @param meta - Optional metadata object
   */
  info(message: string, meta?: object): void;
  
  /**
   * Logs error messages.
   * @param message - Error message
   * @param meta - Optional metadata object
   */
  error(message: string, meta?: object): void;
  
  /**
   * Logs debug messages.
   * @param message - Debug message
   * @param meta - Optional metadata object
   */
  debug(message: string, meta?: object): void;
}

/**
 * Console-based logger implementation for development and testing.
 */
export class ConsoleLogger implements Logger {
  /**
   * Logs informational messages to console.
   * @param message - Log message
   * @param meta - Optional metadata object
   */
  public info(message: string, meta?: object): void {
    console.log(`[INFO] ${message}`, meta || '');
  }

  /**
   * Logs error messages to console.
   * @param message - Error message
   * @param meta - Optional metadata object
   */
  public error(message: string, meta?: object): void {
    console.error(`[ERROR] ${message}`, meta || '');
  }

  /**
   * Logs debug messages to console.
   * @param message - Debug message
   * @param meta - Optional metadata object
   */
  public debug(message: string, meta?: object): void {
    console.debug(`[DEBUG] ${message}`, meta || '');
  }
}