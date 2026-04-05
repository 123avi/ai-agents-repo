/**
 * Application logging utility
 */

/**
 * Simple logger interface for application logging
 */
export const logger = {
  /**
   * Logs error messages with context
   * @param message - Error message
   * @param context - Additional context object
   */
  error(message: string, context?: any): void {
    console.error(`[ERROR] ${message}`, context ? JSON.stringify(context) : '');
  },

  /**
   * Logs info messages with context
   * @param message - Info message
   * @param context - Additional context object
   */
  info(message: string, context?: any): void {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
  },

  /**
   * Logs warning messages with context
   * @param message - Warning message
   * @param context - Additional context object
   */
  warn(message: string, context?: any): void {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : '');
  }
};