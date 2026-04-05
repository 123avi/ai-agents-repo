import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

// Database configuration constants
const DEFAULT_MAX_CONNECTIONS = 20;
const DEFAULT_IDLE_TIMEOUT_MS = 30000;
const DEFAULT_CONNECTION_TIMEOUT_MS = 5000;

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

/**
 * Retrieves database configuration from environment variables
 * @returns DatabaseConfig object with all required database settings
 */
function getDatabaseConfig(): DatabaseConfig {
  const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || DEFAULT_MAX_CONNECTIONS.toString(), 10),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS || DEFAULT_IDLE_TIMEOUT_MS.toString(), 10),
    connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || DEFAULT_CONNECTION_TIMEOUT_MS.toString(), 10)
  };
}

/**
 * Creates and configures PostgreSQL connection pool
 * @returns Configured pg Pool instance
 */
function createConnectionPool(): Pool {
  const config = getDatabaseConfig();
  
  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.maxConnections,
    idleTimeoutMillis: config.idleTimeoutMs,
    connectionTimeoutMillis: config.connectionTimeoutMs
  };

  const pool = new Pool(poolConfig);

  // Handle pool errors
  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  pool.on('connect', () => {
    logger.info('Database client connected');
  });

  return pool;
}

// Create and export the connection pool
export const db = createConnectionPool();

/**
 * Checks database connection health
 * @returns Promise<boolean> true if connection is healthy, false otherwise
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await db.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Gracefully closes the database connection pool
 * @returns Promise<void>
 */
export async function closeDatabasePool(): Promise<void> {
  try {
    await db.end();
    logger.info('Database connection pool closed');
  } catch (error) {
    logger.error('Error closing database pool:', error);
    throw error;
  }
}