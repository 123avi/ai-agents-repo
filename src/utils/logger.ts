/**
 * Application logging utility
 * Provides structured logging for the application
 */

// Log levels enum for type safety
enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

/**
 * Simple logger implementation
 * Can be extended with external logging libraries if needed
 */
class Logger {
  /**
   * Log an informational message
   * @param message - Log message
   * @param meta - Additional metadata
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Log an error message
   * @param message - Error message
   * @param meta - Additional metadata
   */
  error(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  /**
   * Log a warning message
   * @param message - Warning message
   * @param meta - Additional metadata
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Internal logging method
   * @param level - Log level
   * @param message - Log message
   * @param meta - Additional metadata
   */
  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
    };

    console.log(JSON.stringify(logEntry));
  }
}

export const logger = new Logger();