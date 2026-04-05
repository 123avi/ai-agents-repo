/**
 * Structured logging utility for the application
 * Provides sanitized logging that doesn't expose sensitive information
 */

/**
 * Log levels enum
 */
enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Log entry structure
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Sanitizes log metadata to remove sensitive information
 * @param metadata - Raw metadata object
 * @returns Sanitized metadata
 */
function sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> {
  if (!metadata) return {};
  
  const sanitized = { ...metadata };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'authorization', 'secret', 'key'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Creates a structured log entry
 * @param level - Log level
 * @param message - Log message
 * @param metadata - Optional metadata
 */
function createLogEntry(level: LogLevel, message: string, metadata?: Record<string, any>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    metadata: sanitizeMetadata(metadata)
  };
}

/**
 * Outputs log entry to appropriate destination
 * @param entry - Log entry to output
 */
function outputLog(entry: LogEntry): void {
  const logString = JSON.stringify(entry);
  
  // In development, also output to console for readability
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.metadata || '');
  }
  
  // Always output structured JSON for log aggregation
  process.stdout.write(logString + '\n');
}

/**
 * Structured logger implementation
 */
export const logger = {
  /**
   * Log error messages
   * @param message - Error message
   * @param metadata - Optional error context
   */
  error: (message: string, metadata?: Record<string, any>): void => {
    outputLog(createLogEntry(LogLevel.ERROR, message, metadata));
  },

  /**
   * Log warning messages
   * @param message - Warning message
   * @param metadata - Optional warning context
   */
  warn: (message: string, metadata?: Record<string, any>): void => {
    outputLog(createLogEntry(LogLevel.WARN, message, metadata));
  },

  /**
   * Log informational messages
   * @param message - Info message
   * @param metadata - Optional info context
   */
  info: (message: string, metadata?: Record<string, any>): void => {
    outputLog(createLogEntry(LogLevel.INFO, message, metadata));
  },

  /**
   * Log debug messages
   * @param message - Debug message
   * @param metadata - Optional debug context
   */
  debug: (message: string, metadata?: Record<string, any>): void => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      outputLog(createLogEntry(LogLevel.DEBUG, message, metadata));
    }
  }
};