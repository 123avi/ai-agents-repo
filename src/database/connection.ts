import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME = process.env.DB_NAME || 'todo_api';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const MAX_CONNECTIONS = parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10);

let pool: Pool;

/**
 * Initializes database connection pool
 * @returns Pool - PostgreSQL connection pool instance
 */
function initializePool(): Pool {
  const config = DATABASE_URL ? {
    connectionString: DATABASE_URL,
    max: MAX_CONNECTIONS
  } : {
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    max: MAX_CONNECTIONS
  };
  
  return new Pool(config);
}

/**
 * Gets the database connection pool singleton
 * @returns Pool - Active database connection pool
 */
export function getDbPool(): Pool {
  if (!pool) {
    pool = initializePool();
  }
  return pool;
}

/**
 * Closes the database connection pool
 * @returns Promise<void>
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}