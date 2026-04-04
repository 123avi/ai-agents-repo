/**
 * Simple logger utility for error tracking
 */
export const logger = {
  /**
   * Logs error messages with context
   * @param message - Log message
   * @param context - Additional context object
   */
  error(message: string, context?: any): void {
    console.error(`[ERROR] ${message}`, context || '');
  },

  /**
   * Logs info messages
   * @param message - Log message
   */
  info(message: string): void {
    console.log(`[INFO] ${message}`);
  }
};