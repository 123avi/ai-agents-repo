import { Pool } from 'pg';
import { logger } from '../utils/logger';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_NAME = process.env.DB_NAME || 'todo_api';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_MAX_CONNECTIONS = parseInt(process.env.DB_MAX_CONNECTIONS || '20');

if (!DB_PASSWORD) {
  throw new Error('DB_PASSWORD environment variable is required');
}

/**
 * PostgreSQL connection pool configuration
 */
export const db = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: DB_MAX_CONNECTIONS,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

/**
 * Initialize database connection and handle connection events
 */
db.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

db.on('error', (err) => {
  logger.error('Database connection error:', err);
});

process.on('SIGINT', async () => {
  await db.end();
  logger.info('Database connection pool closed');
  process.exit(0);
});