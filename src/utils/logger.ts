/**
 * Simple logging utility for database operations
 * Provides structured logging with different levels
 */
export const logger = {
  /**
   * Log info level messages
   * @param message - Log message
   * @param meta - Additional metadata
   */
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },

  /**
   * Log warning level messages
   * @param message - Log message
   * @param meta - Additional metadata
   */
  warn: (message: string, meta?: any) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },

  /**
   * Log error level messages
   * @param message - Log message
   * @param meta - Additional metadata
   */
  error: (message: string, meta?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};
