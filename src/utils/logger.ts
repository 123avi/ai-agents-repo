/**
 * Centralized logging utility for consistent log formatting across the application
 */
export class Logger {
  /**
   * Log levels for categorizing message importance
   */
  private static readonly LOG_LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG',
  } as const;

  /**
   * Formats log messages with timestamp and structured data
   */
  private static formatMessage(level: string, message: string, meta?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const baseLog = `[${timestamp}] ${level}: ${message}`;
    
    if (meta && Object.keys(meta).length > 0) {
      return `${baseLog} ${JSON.stringify(meta, null, 2)}`;
    }
    
    return baseLog;
  }

  /**
   * Logs error messages with optional metadata
   */
  public static error(message: string, meta?: Record<string, any>): void {
    const formattedMessage = this.formatMessage(this.LOG_LEVELS.ERROR, message, meta);
    console.error(formattedMessage);
  }

  /**
   * Logs warning messages with optional metadata
   */
  public static warn(message: string, meta?: Record<string, any>): void {
    const formattedMessage = this.formatMessage(this.LOG_LEVELS.WARN, message, meta);
    console.warn(formattedMessage);
  }

  /**
   * Logs informational messages with optional metadata
   */
  public static info(message: string, meta?: Record<string, any>): void {
    const formattedMessage = this.formatMessage(this.LOG_LEVELS.INFO, message, meta);
    console.log(formattedMessage);
  }

  /**
   * Logs debug messages with optional metadata (only in development)
   */
  public static debug(message: string, meta?: Record<string, any>): void {
    if (process.env.NODE_ENV !== 'production') {
      const formattedMessage = this.formatMessage(this.LOG_LEVELS.DEBUG, message, meta);
      console.debug(formattedMessage);
    }
  }
}