const { Pool } = require('pg');

// Database test configuration constants
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'todo_test',
  user: process.env.TEST_DB_USER || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password'
};

const ADMIN_DB_CONFIG = {
  ...TEST_DB_CONFIG,
  database: 'postgres' // Connect to default postgres db for setup
};

/**
 * Sets up test database and schema for database tests
 * Creates test database if it doesn't exist and applies schema
 * @returns {Promise<void>}
 */
async function setupTestDatabase() {
  let adminPool;
  let testPool;
  
  try {
    // Connect as admin to create test database
    adminPool = new Pool(ADMIN_DB_CONFIG);
    
    // Create test database if it doesn't exist
    await adminPool.query(`
      SELECT 'CREATE DATABASE ${TEST_DB_CONFIG.database}'
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${TEST_DB_CONFIG.database}');
    `);
    
    console.log('Test database created/verified');
    
    // Connect to test database to create schema
    testPool = new Pool(TEST_DB_CONFIG);
    
    // Create test schema
    await createTestSchema(testPool);
    
    console.log('Test schema created');
    
  } catch (error) {
    console.error('Failed to setup test database:', error.message);
    throw error;
  } finally {
    if (adminPool) await adminPool.end();
    if (testPool) await testPool.end();
  }
}

/**
 * Creates the test database schema including tables and constraints
 * @param {Pool} pool - Database connection pool
 * @returns {Promise<void>}
 */
async function createTestSchema(pool) {
  // Create users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
    );
  `);
  
  // Create todos table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create migrations table for migration tests
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_id VARCHAR(255) NOT NULL,
      action VARCHAR(20) NOT NULL CHECK (action IN ('apply', 'rollback')),
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create indexes for performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  `);
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
  `);
}

/**
 * Cleans up test database by dropping all test data
 * @returns {Promise<void>}
 */
async function cleanupTestDatabase() {
  const testPool = new Pool(TEST_DB_CONFIG);
  
  try {
    // Truncate all tables in reverse dependency order
    await testPool.query('TRUNCATE TABLE todos, users, schema_migrations CASCADE');
    console.log('Test database cleaned up');
  } catch (error) {
    console.error('Failed to cleanup test database:', error.message);
    throw error;
  } finally {
    await testPool.end();
  }
}

/**
 * Drops the test database completely
 * @returns {Promise<void>}
 */
async function dropTestDatabase() {
  const adminPool = new Pool(ADMIN_DB_CONFIG);
  
  try {
    // Terminate all connections to test database
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${TEST_DB_CONFIG.database}' AND pid <> pg_backend_pid();
    `);
    
    // Drop test database
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_CONFIG.database}`);
    console.log('Test database dropped');
  } catch (error) {
    console.error('Failed to drop test database:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }
}

module.exports = {
  TEST_DB_CONFIG,
  setupTestDatabase,
  cleanupTestDatabase,
  dropTestDatabase
};