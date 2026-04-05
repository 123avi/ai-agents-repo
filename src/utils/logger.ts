import { createLogger, format, transports } from 'winston';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * Application logger configured for structured logging
 */
export const logger = createLogger({
  level: LOG_LEVEL,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});