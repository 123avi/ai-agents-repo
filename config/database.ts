import { Pool, PoolConfig } from 'pg';

// Database connection constants
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_NAME = process.env.DB_NAME || 'todo_db';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
const DB_MAX_CONNECTIONS = parseInt(process.env.DB_MAX_CONNECTIONS || '20');
const DB_IDLE_TIMEOUT = parseInt(process.env.DB_IDLE_TIMEOUT || '30000');
const DB_CONNECTION_TIMEOUT = parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000');

/**
 * Database connection pool configuration
 */
const poolConfig: PoolConfig = {
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: DB_MAX_CONNECTIONS,
  idleTimeoutMillis: DB_IDLE_TIMEOUT,
  connectionTimeoutMillis: DB_CONNECTION_TIMEOUT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

/**
 * Create and export database connection pool
 */
const pool = new Pool(poolConfig);

/**
 * Test database connection on startup
 */
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

export { pool };