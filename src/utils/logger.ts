/**
 * Simple logging utility for application events and errors
 */
export const logger = {
  /**
   * Logs informational messages
   * @param message - Log message
   * @param meta - Additional metadata
   */
  info: (message: string, meta?: any): void => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level: 'info', message, ...meta };
    console.log(JSON.stringify(logEntry));
  },

  /**
   * Logs error messages
   * @param message - Error message
   * @param meta - Additional error metadata
   */
  error: (message: string, meta?: any): void => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level: 'error', message, ...meta };
    console.error(JSON.stringify(logEntry));
  },

  /**
   * Logs warning messages
   * @param message - Warning message
   * @param meta - Additional metadata
   */
  warn: (message: string, meta?: any): void => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level: 'warn', message, ...meta };
    console.warn(JSON.stringify(logEntry));
  }
};