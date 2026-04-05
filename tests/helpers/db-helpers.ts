import { Pool } from 'pg';

/**
 * Database configuration constants for testing
 */
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME,
  user: process.env.TEST_DB_USER,
  password: process.env.TEST_DB_PASSWORD,
};

/**
 * Test database connection pool
 */
let testDbPool: Pool | null = null;

/**
 * Initialize test database connection and setup schema
 * @throws {Error} If database configuration is invalid or connection fails
 */
export async function setupTestDb(): Promise<void> {
  try {
    // Validate required environment variables
    if (!TEST_DB_CONFIG.database || !TEST_DB_CONFIG.user || !TEST_DB_CONFIG.password) {
      throw new Error('Missing required test database environment variables: TEST_DB_NAME, TEST_DB_USER, TEST_DB_PASSWORD');
    }

    testDbPool = new Pool(TEST_DB_CONFIG);

    // Test connection
    const client = await testDbPool.connect();
    client.release();

    // Setup test schema if needed
    await createTestTables();
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Create necessary tables for testing
 * @throws {Error} If table creation fails
 */
async function createTestTables(): Promise<void> {
  if (!testDbPool) {
    throw new Error('Test database pool not initialized');
  }

  try {
    await testDbPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await testDbPool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('Failed to create test tables:', error);
    throw error;
  }
}

/**
 * Clean up test data using database transactions for isolation
 * @throws {Error} If cleanup operation fails
 */
export async function cleanupTestDb(): Promise<void> {
  if (!testDbPool) {
    throw new Error('Test database pool not initialized');
  }

  const client = await testDbPool.connect();
  try {
    await client.query('BEGIN');
    
    // Use TRUNCATE with CASCADE for better performance and referential integrity
    await client.query('TRUNCATE TABLE todos, users RESTART IDENTITY CASCADE');
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to cleanup test database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close test database connection pool
 * @throws {Error} If connection close fails
 */
export async function closeTestDb(): Promise<void> {
  try {
    if (testDbPool) {
      await testDbPool.end();
      testDbPool = null;
    }
  } catch (error) {
    console.error('Failed to close test database connection:', error);
    throw error;
  }
}

/**
 * Get test database pool instance for direct queries in tests
 * @returns {Pool} The test database pool
 * @throws {Error} If pool is not initialized
 */
export function getTestDbPool(): Pool {
  if (!testDbPool) {
    throw new Error('Test database pool not initialized. Call setupTestDb() first.');
  }
  return testDbPool;
}