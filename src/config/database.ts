/** Database configuration constants */
const CONFIG_DEFAULTS = {
  PORT: 5432,
  MAX_CONNECTIONS: 20,
  MIN_CONNECTIONS: 5
} as const;

/** Required environment variables for database connection */
const REQUIRED_ENV_VARS = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
] as const;

/**
 * Validates that all required environment variables are present
 * @throws Error if any required environment variable is missing
 */
function validateEnvironmentVariables(): void {
  const missing = REQUIRED_ENV_VARS.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Database configuration object built from environment variables
 * Validates required variables and provides sensible defaults
 */
export const config = {
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT || CONFIG_DEFAULTS.PORT.toString(), 10),
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  maxConnections: parseInt(
    process.env.DB_MAX_CONNECTIONS || CONFIG_DEFAULTS.MAX_CONNECTIONS.toString(),
    10
  ),
  minConnections: parseInt(
    process.env.DB_MIN_CONNECTIONS || CONFIG_DEFAULTS.MIN_CONNECTIONS.toString(),
    10
  )
};

// Validate environment variables on module load
validateEnvironmentVariables();

/**
 * Validates database configuration values
 * @throws Error if configuration values are invalid
 */
export function validateDatabaseConfig(): void {
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid database port: ${config.port}`);
  }
  
  if (config.maxConnections < config.minConnections) {
    throw new Error('DB_MAX_CONNECTIONS must be greater than or equal to DB_MIN_CONNECTIONS');
  }
  
  if (config.minConnections < 1) {
    throw new Error('DB_MIN_CONNECTIONS must be at least 1');
  }
  
  if (config.maxConnections > 100) {
    throw new Error('DB_MAX_CONNECTIONS should not exceed 100 for typical applications');
  }
}