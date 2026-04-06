/**
 * Database configuration using environment variables
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  max: number;
  min: number;
}

/**
 * Default configuration constants
 */
export const DEFAULT_CONFIG = {
  PORT: 5432,
  CONNECTION_TIMEOUT_MS: 10000,
  IDLE_TIMEOUT_MS: 30000,
  MAX_CONNECTIONS: 20,
  MIN_CONNECTIONS: 10,
  SSL_ENABLED: true
} as const;

/**
 * Get database configuration from environment variables
 * @returns {DatabaseConfig} Database configuration object
 * @throws {Error} If required environment variables are missing
 */
export function getDatabaseConfig(): DatabaseConfig {
  const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || DEFAULT_CONFIG.PORT.toString(), 10),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ssl: process.env.DB_SSL === 'false' ? false : DEFAULT_CONFIG.SSL_ENABLED,
    connectionTimeoutMillis: DEFAULT_CONFIG.CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: DEFAULT_CONFIG.IDLE_TIMEOUT_MS,
    max: DEFAULT_CONFIG.MAX_CONNECTIONS,
    min: DEFAULT_CONFIG.MIN_CONNECTIONS
  };
}