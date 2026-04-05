/**
 * Simple logger utility for application logging
 */
export const logger = {
  /**
   * Logs info level messages
   * @param message Log message
   * @param data Optional data object
   */
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, data || '');
  },

  /**
   * Logs error level messages
   * @param message Log message
   * @param error Optional error object
   */
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error || '');
  },

  /**
   * Logs warning level messages
   * @param message Log message
   * @param data Optional data object
   */
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, data || '');
  }
};