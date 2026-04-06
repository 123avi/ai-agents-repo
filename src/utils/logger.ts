/**
 * Simple logger utility
 */
export const logger = {
  /**
   * Logs error messages
   * @param message - Error message
   * @param error - Error object
   */
  error: (message: string, error?: any): void => {
    console.error(`[ERROR] ${message}`, error);
  },

  /**
   * Logs info messages
   * @param message - Info message
   */
  info: (message: string): void => {
    console.log(`[INFO] ${message}`);
  },

  /**
   * Logs warning messages
   * @param message - Warning message
   */
  warn: (message: string): void => {
    console.warn(`[WARN] ${message}`);
  }
};