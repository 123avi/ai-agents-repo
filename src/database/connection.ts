import { Pool, PoolConfig } from 'pg';
import { config } from 'dotenv';

config();

// Constants
const DEFAULT_MAX_CONNECTIONS = 10;
const DEFAULT_IDLE_TIMEOUT_MS = 10000;
const DEFAULT_CONNECTION_TIMEOUT_MS = 5000;
const HEALTH_CHECK_QUERY = 'SELECT 1';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Validates required environment variables for database connection
 * @throws {Error} If any required environment variable is missing
 */
function validateDatabaseEnvironment(): void {
  const requiredVars = {
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Validate environment variables at module initialization
validateDatabaseEnvironment();

/**
 * Creates PostgreSQL connection pool configuration
 * @returns {PoolConfig} Pool configuration object
 */
function createPoolConfig(): PoolConfig {
  const sslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
  
  return {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    max: parseInt(process.env.DB_MAX_CONNECTIONS || DEFAULT_MAX_CONNECTIONS.toString(), 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || DEFAULT_IDLE_TIMEOUT_MS.toString(), 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || DEFAULT_CONNECTION_TIMEOUT_MS.toString(), 10),
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: sslRejectUnauthorized
    } : false
  };
}

// Create connection pool
const pool = new Pool(createPoolConfig());

/**
 * Executes a database query with parameters
 * @template T - Expected result type
 * @param {string} query - SQL query string
 * @param {unknown[]} params - Query parameters
 * @returns {Promise<T[]>} Query results
 * @throws {Error} Database connection or query execution error
 */
export async function executeQuery<T = any>(query: string, params: unknown[] = []): Promise<T[]> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Performs database health check with retry logic
 * @returns {Promise<boolean>} True if database is healthy
 */
export async function healthCheck(): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      await executeQuery(HEALTH_CHECK_QUERY);
      return true;
    } catch (error) {
      console.error(`Health check attempt ${attempt} failed:`, error);
      
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }
  
  return false;
}

/**
 * Gracefully closes all database connections
 * @returns {Promise<void>}
 */
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('Database pool closed successfully');
  } catch (error) {
    console.error('Error closing database pool:', error);
    throw error;
  }
}

// Graceful shutdown handlers with error handling
function setupGracefulShutdown(): void {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      try {
        console.log(`Received ${signal}, closing database connections...`);
        await closePool();
        process.exit(0);
      } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });
  });
}

// Initialize graceful shutdown
setupGracefulShutdown();

export { pool };
export default pool;