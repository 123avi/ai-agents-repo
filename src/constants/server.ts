/**
 * Server configuration constants
 */
export const SERVER_CONSTANTS = {
  DEFAULT_PORT: 3000,
  HEALTH_CHECK_PATH: '/health',
  API_PREFIX: '/api',
  SHUTDOWN_TIMEOUT_MS: 5000,
} as const;

/**
 * HTTP status codes used throughout the application
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Environment constants
 */
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;