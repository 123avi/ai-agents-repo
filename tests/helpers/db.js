const { Pool } = require('pg');

const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'todo_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password'
};

let testPool;

/**
 * Initialize test database connection pool and setup schema
 * Creates necessary tables for testing
 */
async function setupTestDb() {
  try {
    testPool = new Pool(TEST_DB_CONFIG);
    
    // Create users table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create todos table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Test database setup completed');
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
}

/**
 * Clean up test database by truncating all tables
 * Preserves table structure but removes all data
 */
async function cleanupTestDb() {
  try {
    if (testPool) {
      await testPool.query('TRUNCATE TABLE todos, users RESTART IDENTITY CASCADE');
    }
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    throw error;
  }
}

/**
 * Close test database connection pool
 * Should be called after all tests complete
 */
async function closeTestDb() {
  try {
    if (testPool) {
      await testPool.end();
      testPool = null;
    }
  } catch (error) {
    console.error('Error closing test database:', error);
    throw error;
  }
}

/**
 * Get test database pool for direct queries in tests
 * @returns {Pool} PostgreSQL connection pool
 */
function getTestPool() {
  return testPool;
}

module.exports = {
  setupTestDb,
  cleanupTestDb,
  closeTestDb,
  getTestPool
};