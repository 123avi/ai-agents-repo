import pino, { Logger } from 'pino';

/** Log levels supported by the application */
const LOG_LEVELS = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
} as const;

/** Default log level for production */
const DEFAULT_LOG_LEVEL = 'info';

/**
 * Creates and configures a production-ready logger using Pino
 * Supports structured logging with proper log levels and formatting
 * @returns {Logger} Configured Pino logger instance
 */
function createLogger(): Logger {
  const logLevel = process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL;
  
  const pinoConfig = {
    level: logLevel,
    formatters: {
      level: (label: string) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(process.env.NODE_ENV === 'production' 
      ? {} 
      : { transport: { target: 'pino-pretty', options: { colorize: true } } }
    )
  };
  
  return pino(pinoConfig);
}

/** Global logger instance */
export const logger = createLogger();

/**
 * Logs database connection events with structured data
 * @param {string} event - The database event type
 * @param {Record<string, unknown>} metadata - Additional event metadata
 */
export function logDatabaseEvent(event: string, metadata: Record<string, unknown> = {}): void {
  logger.info({ event, ...metadata }, `Database event: ${event}`);
}

/**
 * Logs database errors with proper error context
 * @param {string} operation - The database operation that failed
 * @param {Error} error - The error that occurred
 * @param {Record<string, unknown>} context - Additional error context
 */
export function logDatabaseError(operation: string, error: Error, context: Record<string, unknown> = {}): void {
  logger.error({ 
    operation, 
    error: error.message, 
    stack: error.stack,
    ...context 
  }, `Database operation failed: ${operation}`);
}