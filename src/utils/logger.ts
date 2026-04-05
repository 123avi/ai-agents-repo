const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

/**
 * Simple structured logger for application events
 */
export class Logger {
  private logLevel: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.logLevel = level;
  }

  /**
   * Logs debug messages
   * @param message - Log message
   * @param context - Additional context data
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.log('DEBUG', message, context);
    }
  }

  /**
   * Logs info messages
   * @param message - Log message
   * @param context - Additional context data
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.log('INFO', message, context);
    }
  }

  /**
   * Logs warning messages
   * @param message - Log message
   * @param context - Additional context data
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.log('WARN', message, context);
    }
  }

  /**
   * Logs error messages
   * @param message - Log message
   * @param context - Additional context data
   */
  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      this.log('ERROR', message, context);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private log(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context
    };
    console.log(JSON.stringify(logEntry));
  }
}

export const logger = new Logger(LOG_LEVEL as LogLevel);