/**
 * Simple logger interface for database and health check logging
 */
interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * Basic console logger implementation
 * In production, this would be replaced with a proper logging library
 */
class ConsoleLogger implements Logger {
  /**
   * Logs info level messages
   * @param message Log message
   * @param args Additional arguments
   */
  info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  /**
   * Logs warning level messages
   * @param message Log message
   * @param args Additional arguments
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  /**
   * Logs error level messages
   * @param message Log message
   * @param args Additional arguments
   */
  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  }
}

// Export singleton logger instance
export const logger: Logger = new ConsoleLogger();