/**
 * Logger utility for application-wide logging
 */
export class Logger {
  /**
   * Logs error messages with timestamp
   * @param message - Error message
   * @param error - Optional error object or additional context
   */
  error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    const errorInfo = error instanceof Error ? error.stack : JSON.stringify(error);
    
    console.error(`[${timestamp}] ERROR: ${message}`, errorInfo || '');
    
    // In production, this would integrate with external logging service
    // like Winston, Bunyan, or cloud logging providers
  }

  /**
   * Logs info messages with timestamp
   * @param message - Info message
   * @param context - Optional context data
   */
  info(message: string, context?: any): void {
    const timestamp = new Date().toISOString();
    const contextInfo = context ? JSON.stringify(context) : '';
    
    console.log(`[${timestamp}] INFO: ${message}`, contextInfo);
  }

  /**
   * Logs warning messages with timestamp
   * @param message - Warning message
   * @param context - Optional context data
   */
  warn(message: string, context?: any): void {
    const timestamp = new Date().toISOString();
    const contextInfo = context ? JSON.stringify(context) : '';
    
    console.warn(`[${timestamp}] WARN: ${message}`, contextInfo);
  }
}

export const logger = new Logger();