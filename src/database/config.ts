import { PoolConfig } from 'pg';

const MIN_PORT = 1;
const MAX_PORT = 65535;
const DEFAULT_DATABASE_PORT = 5432;
const DEFAULT_MAX_CONNECTIONS = 20;
const DEFAULT_IDLE_TIMEOUT_MS = 10000;
const DEFAULT_CONNECTION_TIMEOUT_MS = 2000;

/**
 * Validates that a port number is within valid range (1-65535)
 * @param port - Port number to validate
 * @returns True if port is valid, false otherwise
 */
function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= MIN_PORT && port <= MAX_PORT;
}

/**
 * Gets database configuration from environment variables with validation
 * @returns PostgreSQL pool configuration object
 * @throws Error if required environment variables are missing or invalid
 */
export function getDatabaseConfig(): PoolConfig {
  const host = process.env.DB_HOST;
  const portString = process.env.DB_PORT;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host || !database || !user || !password) {
    throw new Error('Missing required database environment variables: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD');
  }

  // Parse and validate port
  const port = portString ? parseInt(portString, 10) : DEFAULT_DATABASE_PORT;
  if (!isValidPort(port)) {
    throw new Error(`Invalid database port: ${portString}. Port must be an integer between ${MIN_PORT} and ${MAX_PORT}`);
  }

  return {
    host,
    port,
    database,
    user,
    password,
    max: DEFAULT_MAX_CONNECTIONS,
    idleTimeoutMillis: DEFAULT_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS
  };
}