/**
 * Application logger utility for structured logging
 * Provides consistent logging interface across the application
 */
export class AppLogger {
  /**
   * Logs informational messages
   * @param message - The log message
   * @param meta - Additional metadata to include in log
   */
  static info(message: string, meta?: Record<string, any>): void {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }

  /**
   * Logs error messages
   * @param message - The error message
   * @param meta - Additional error metadata
   */
  static error(message: string, meta?: Record<string, any>): void {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }

  /**
   * Logs warning messages
   * @param message - The warning message
   * @param meta - Additional warning metadata
   */
  static warn(message: string, meta?: Record<string, any>): void {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
}