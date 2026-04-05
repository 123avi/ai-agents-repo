/**
 * Logger utility providing structured logging for the application.
 * Uses console methods in development; can be extended for production logging.
 */
export const logger = {
  /**
   * Logs informational messages.
   * @param message - Log message
   * @param meta - Additional metadata to include
   */
  info(message: string, meta?: Record<string, any>): void {
    console.info({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    });
  },

  /**
   * Logs debug messages.
   * @param message - Log message
   * @param meta - Additional metadata to include
   */
  debug(message: string, meta?: Record<string, any>): void {
    console.debug({
      level: 'debug',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    });
  },

  /**
   * Logs error messages.
   * @param message - Log message
   * @param meta - Additional metadata to include
   */
  error(message: string, meta?: Record<string, any>): void {
    console.error({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    });
  }
};