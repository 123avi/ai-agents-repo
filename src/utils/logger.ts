/**
 * Simple logger interface for database operations
 */
export const logger = {
  /**
   * Logs info level messages
   * @param message - Log message
   * @param meta - Optional metadata
   */
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, meta || '');
  },

  /**
   * Logs warning level messages
   * @param message - Log message
   * @param meta - Optional metadata
   */
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, meta || '');
  },

  /**
   * Logs error level messages
   * @param message - Log message
   * @param meta - Optional metadata
   */
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, meta || '');
  }
};