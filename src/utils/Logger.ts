/**
 * Static logger utility for application-wide logging.
 * Provides centralized logging with different severity levels.
 */
export class Logger {
  /**
   * Logs informational messages.
   * @param message - The message to log
   * @param meta - Optional metadata object
   */
  static info(message: string, meta?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logEntry = meta ? `${timestamp} [INFO] ${message} ${JSON.stringify(meta)}` : `${timestamp} [INFO] ${message}`;
    console.log(logEntry);
  }

  /**
   * Logs warning messages.
   * @param message - The message to log
   * @param meta - Optional metadata object
   */
  static warn(message: string, meta?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logEntry = meta ? `${timestamp} [WARN] ${message} ${JSON.stringify(meta)}` : `${timestamp} [WARN] ${message}`;
    console.warn(logEntry);
  }

  /**
   * Logs error messages.
   * @param message - The message to log
   * @param meta - Optional metadata object
   */
  static error(message: string, meta?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logEntry = meta ? `${timestamp} [ERROR] ${message} ${JSON.stringify(meta)}` : `${timestamp} [ERROR] ${message}`;
    console.error(logEntry);
  }
}