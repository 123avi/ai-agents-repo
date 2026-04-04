/** Log levels for structured logging */
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/** Log entry structure */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

/**
 * Simple structured logger for database operations
 * Outputs JSON formatted logs for production readiness
 */
class Logger {
  /**
   * Creates a formatted log entry
   * @param level Log level
   * @param message Log message
   * @param data Optional additional data
   */
  private formatLog(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data })
    };
  }

  /**
   * Outputs log entry to console
   * @param logEntry Formatted log entry
   */
  private output(logEntry: LogEntry): void {
    const output = process.env.NODE_ENV === 'production' 
      ? JSON.stringify(logEntry)
      : `[${logEntry.timestamp}] ${logEntry.level.toUpperCase()}: ${logEntry.message}${logEntry.data ? ` ${JSON.stringify(logEntry.data)}` : ''}`;
    
    console.log(output);
  }

  /**
   * Logs an info message
   * @param message Info message
   * @param data Optional additional data
   */
  info(message: string, data?: unknown): void {
    this.output(this.formatLog('info', message, data));
  }

  /**
   * Logs a warning message
   * @param message Warning message
   * @param data Optional additional data
   */
  warn(message: string, data?: unknown): void {
    this.output(this.formatLog('warn', message, data));
  }

  /**
   * Logs an error message
   * @param message Error message
   * @param data Optional additional data (typically Error object)
   */
  error(message: string, data?: unknown): void {
    this.output(this.formatLog('error', message, data));
  }

  /**
   * Logs a debug message (only in development)
   * @param message Debug message
   * @param data Optional additional data
   */
  debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      this.output(this.formatLog('debug', message, data));
    }
  }
}

/** Singleton logger instance */
export const logger = new Logger();