/**
 * Simple structured logger for application events.
 * Provides consistent logging interface across the application.
 */
class Logger {
  private formatMessage(level: string, message: string, meta?: object): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };
    return JSON.stringify(logEntry);
  }

  /**
   * Logs informational messages.
   * 
   * @param message - Log message
   * @param meta - Additional metadata
   */
  info(message: string, meta?: object): void {
    console.log(this.formatMessage('INFO', message, meta));
  }

  /**
   * Logs error messages.
   * 
   * @param message - Error message
   * @param meta - Additional metadata including error details
   */
  error(message: string, meta?: object): void {
    console.error(this.formatMessage('ERROR', message, meta));
  }

  /**
   * Logs warning messages.
   * 
   * @param message - Warning message
   * @param meta - Additional metadata
   */
  warn(message: string, meta?: object): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }
}

export const logger = new Logger();