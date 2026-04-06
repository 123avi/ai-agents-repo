/**
 * Structured logging utility
 * Provides consistent logging interface across the application
 * TODO: Replace with proper logging library like winston or pino for production
 */
export class Logger {
  /**
   * Log informational messages
   * @param message - Log message
   * @param meta - Additional metadata
   */
  info(message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level: 'INFO',
      timestamp,
      message,
      ...(meta && { meta })
    };
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Log warning messages
   * @param message - Log message
   * @param meta - Additional metadata
   */
  warn(message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level: 'WARN',
      timestamp,
      message,
      ...(meta && { meta })
    };
    console.warn(JSON.stringify(logEntry));
  }

  /**
   * Log error messages
   * @param message - Log message
   * @param error - Error object or additional metadata
   */
  error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level: 'ERROR',
      timestamp,
      message,
      ...(error && { error: error.message || error })
    };
    console.error(JSON.stringify(logEntry));
  }
}