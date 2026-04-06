/**
 * Centralized logging utility for the application
 */
export interface LogLevel {
  INFO: 'info';
  ERROR: 'error';
  WARN: 'warn';
  DEBUG: 'debug';
}

export const LOG_LEVELS: LogLevel = {
  INFO: 'info',
  ERROR: 'error',
  WARN: 'warn',
  DEBUG: 'debug'
};

/**
 * Logger interface for structured logging
 */
export interface Logger {
  /**
   * Logs an informational message
   * @param message - Log message
   * @param meta - Optional metadata object
   */
  info(message: string, meta?: object): void;

  /**
   * Logs an error message
   * @param message - Error message
   * @param meta - Optional metadata object
   */
  error(message: string, meta?: object): void;

  /**
   * Logs a warning message
   * @param message - Warning message
   * @param meta - Optional metadata object
   */
  warn(message: string, meta?: object): void;

  /**
   * Logs a debug message
   * @param message - Debug message
   * @param meta - Optional metadata object
   */
  debug(message: string, meta?: object): void;
}

/**
 * Simple console logger implementation
 */
class ConsoleLogger implements Logger {
  /**
   * Logs an informational message to console
   * @param message - Log message
   * @param meta - Optional metadata object
   */
  info(message: string, meta?: object): void {
    console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  /**
   * Logs an error message to console
   * @param message - Error message
   * @param meta - Optional metadata object
   */
  error(message: string, meta?: object): void {
    console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  /**
   * Logs a warning message to console
   * @param message - Warning message
   * @param meta - Optional metadata object
   */
  warn(message: string, meta?: object): void {
    console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  /**
   * Logs a debug message to console
   * @param message - Debug message
   * @param meta - Optional metadata object
   */
  debug(message: string, meta?: object): void {
    console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }
}

export const logger: Logger = new ConsoleLogger();