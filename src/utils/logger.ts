/**
 * Simple logger utility for consistent logging across the application
 */
export const logger = {
  /**
   * Log info level messages
   * @param message - Log message
   * @param meta - Optional metadata object
   */
  info: (message: string, meta?: Record<string, any>) => {
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
   * @param meta - Optional metadata object
   */
  warn: (message: string, meta?: Record<string, any>) => {
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
   * @param meta - Optional metadata object
   */
  error: (message: string, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};