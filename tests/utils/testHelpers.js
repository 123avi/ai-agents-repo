const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const TEST_DB_CONNECTION_TIMEOUT = 5000;
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Sets up test database connection and ensures tables exist
 * @returns {Promise<void>}
 * @throws {Error} If database setup fails
 */
async function setupTestDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: TEST_DB_CONNECTION_TIMEOUT
  });

  try {
    // Test connection and ensure tables exist
    const client = await pool.connect();
    
    // Check if users table exists, create if not
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    client.release();
  } catch (error) {
    console.error('Database setup failed:', error.message);
    throw new Error(`Test database setup failed: ${error.message}`);
  } finally {
    await pool.end();
  }
}

/**
 * Creates a test user in the database
 * @param {string} email - User email address
 * @param {string} password - Plain text password
 * @returns {Promise<number>} User ID of created user
 * @throws {Error} If user creation fails
 */
async function createTestUser(email, password) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: TEST_DB_CONNECTION_TIMEOUT
  });

  try {
    const client = await pool.connect();
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    
    const result = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, hashedPassword]
    );
    
    client.release();
    return result.rows[0].id;
  } catch (error) {
    console.error('Test user creation failed:', error.message);
    throw new Error(`Failed to create test user: ${error.message}`);
  } finally {
    await pool.end();
  }
}

/**
 * Removes test user from database
 * @param {number} userId - ID of user to remove
 * @returns {Promise<void>}
 * @throws {Error} If user cleanup fails
 */
async function cleanupTestUser(userId) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: TEST_DB_CONNECTION_TIMEOUT
  });

  try {
    const client = await pool.connect();
    
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    
    client.release();
  } catch (error) {
    console.error('Test user cleanup failed:', error.message);
    throw new Error(`Failed to cleanup test user ${userId}: ${error.message}`);
  } finally {
    await pool.end();
  }
}

module.exports = {
  setupTestDatabase,
  createTestUser,
  cleanupTestUser
};