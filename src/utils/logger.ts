/**
 * Simple logger interface for structured logging
 */
export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}

/**
 * Basic console logger implementation
 */
class ConsoleLogger implements Logger {
  info(message: string, meta?: Record<string, any>): void {
    console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
  }

  warn(message: string, meta?: Record<string, any>): void {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() }));
  }

  error(message: string, meta?: Record<string, any>): void {
    console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() }));
  }
}

export const logger = new ConsoleLogger();