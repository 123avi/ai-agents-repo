/**
 * Simple logger utility for application logging
 */
export const logger = {
  /**
   * Logs error messages with timestamp
   * @param message - Error message
   * @param error - Optional error object
   */
  error: (message: string, error?: any): void => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error || '');
  },

  /**
   * Logs info messages with timestamp
   * @param message - Info message
   */
  info: (message: string): void => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`);
  },

  /**
   * Logs warning messages with timestamp
   * @param message - Warning message
   */
  warn: (message: string): void => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`);
  }
};