import { Pool, PoolConfig } from 'pg';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: {
    require: boolean;
    rejectUnauthorized: boolean;
  };
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
}

/**
 * Environment configuration keys
 */
const ENV_KEYS = {
  DB_HOST: 'DB_HOST',
  DB_PORT: 'DB_PORT',
  DB_NAME: 'DB_NAME',
  DB_USER: 'DB_USER',
  DB_PASSWORD: 'DB_PASSWORD',
  DB_SSL_REQUIRE: 'DB_SSL_REQUIRE',
  DB_SSL_REJECT_UNAUTHORIZED: 'DB_SSL_REJECT_UNAUTHORIZED',
  DB_POOL_MIN: 'DB_POOL_MIN',
  DB_POOL_MAX: 'DB_POOL_MAX',
  DB_IDLE_TIMEOUT: 'DB_IDLE_TIMEOUT',
  DB_CONNECTION_TIMEOUT: 'DB_CONNECTION_TIMEOUT'
} as const;

const DEFAULT_VALUES = {
  PORT: 5432,
  SSL_REQUIRE: false,
  SSL_REJECT_UNAUTHORIZED: true,
  POOL_MIN: 2,
  POOL_MAX: 20,
  IDLE_TIMEOUT: 30000,
  CONNECTION_TIMEOUT: 2000
} as const;

/**
 * Validates that all required environment variables are present and valid
 * @throws {Error} When required environment variables are missing or invalid
 */
export function validateEnvironmentConfig(): void {
  const required = [ENV_KEYS.DB_HOST, ENV_KEYS.DB_NAME, ENV_KEYS.DB_USER, ENV_KEYS.DB_PASSWORD];
  
  for (const key of required) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    if (value.trim() === '') {
      throw new Error(`Environment variable ${key} cannot be empty`);
    }
  }

  const port = process.env[ENV_KEYS.DB_PORT];
  if (port && (isNaN(Number(port)) || Number(port) <= 0)) {
    throw new Error('DB_PORT must be a positive number');
  }
}

/**
 * Creates database configuration from environment variables
 * @returns {DatabaseConfig} Database configuration object
 */
export function createDatabaseConfig(): DatabaseConfig {
  validateEnvironmentConfig();

  return {
    host: process.env[ENV_KEYS.DB_HOST]!,
    port: process.env[ENV_KEYS.DB_PORT] ? Number(process.env[ENV_KEYS.DB_PORT]) : DEFAULT_VALUES.PORT,
    database: process.env[ENV_KEYS.DB_NAME]!,
    user: process.env[ENV_KEYS.DB_USER]!,
    password: process.env[ENV_KEYS.DB_PASSWORD]!, // Password secured via env vars
    ssl: {
      require: process.env[ENV_KEYS.DB_SSL_REQUIRE] === 'true' || DEFAULT_VALUES.SSL_REQUIRE,
      rejectUnauthorized: process.env[ENV_KEYS.DB_SSL_REJECT_UNAUTHORIZED] !== 'false'
    },
    pool: {
      min: process.env[ENV_KEYS.DB_POOL_MIN] ? Number(process.env[ENV_KEYS.DB_POOL_MIN]) : DEFAULT_VALUES.POOL_MIN,
      max: process.env[ENV_KEYS.DB_POOL_MAX] ? Number(process.env[ENV_KEYS.DB_POOL_MAX]) : DEFAULT_VALUES.POOL_MAX,
      idleTimeoutMillis: process.env[ENV_KEYS.DB_IDLE_TIMEOUT] ? Number(process.env[ENV_KEYS.DB_IDLE_TIMEOUT]) : DEFAULT_VALUES.IDLE_TIMEOUT,
      connectionTimeoutMillis: process.env[ENV_KEYS.DB_CONNECTION_TIMEOUT] ? Number(process.env[ENV_KEYS.DB_CONNECTION_TIMEOUT]) : DEFAULT_VALUES.CONNECTION_TIMEOUT
    }
  };
}