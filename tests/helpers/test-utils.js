const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Test database configuration
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'todo_test',
  user: process.env.TEST_DB_USER || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password'
};

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
const SALT_ROUNDS = 10;

let testDbPool;

/**
 * Initialize test database connection and create tables
 * @returns {Promise<void>}
 */
async function setupTestDatabase() {
  testDbPool = new Pool(TEST_DB_CONFIG);
  
  // Create tables if they don't exist
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
}

/**
 * Clean up test database and close connections
 * @returns {Promise<void>}
 */
async function cleanupTestDatabase() {
  if (testDbPool) {
    // Clean all test data
    await testDbPool.query('DELETE FROM todos');
    await testDbPool.query('DELETE FROM users');
    await testDbPool.end();
  }
}

/**
 * Create a test user in the database
 * @param {string} email - User email address
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} Created user object (without password_hash)
 */
async function createTestUser(email, password) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const result = await testDbPool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at, updated_at',
    [email, passwordHash]
  );
  
  return result.rows[0];
}

/**
 * Generate a valid JWT token for testing
 * @param {string} userId - User ID to include in token
 * @param {string} expiresIn - Token expiration time (default: 1h)
 * @returns {string} JWT token
 */
function generateTestToken(userId, expiresIn = '1h') {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Generate an expired JWT token for testing
 * @param {string} userId - User ID to include in token
 * @returns {string} Expired JWT token
 */
function generateExpiredTestToken(userId) {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '-1h' }
  );
}

/**
 * Create a test todo item in the database
 * @param {string} userId - ID of the user who owns the todo
 * @param {string} title - Todo title
 * @param {string} description - Todo description (optional)
 * @param {boolean} completed - Todo completion status (default: false)
 * @returns {Promise<Object>} Created todo object
 */
async function createTestTodo(userId, title, description = 'Test description', completed = false) {
  const result = await testDbPool.query(
    'INSERT INTO todos (user_id, title, description, completed) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, title, description, completed]
  );
  
  return result.rows[0];
}

/**
 * Clear all todos for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function clearUserTodos(userId) {
  await testDbPool.query('DELETE FROM todos WHERE user_id = $1', [userId]);
}

/**
 * Get database connection pool for advanced test operations
 * @returns {Pool} PostgreSQL connection pool
 */
function getTestDbPool() {
  return testDbPool;
}

/**
 * Verify JWT token and extract user ID
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
function verifyTestToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Set up test data for a complete user scenario
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Array} todos - Array of todo objects to create
 * @returns {Promise<Object>} Object containing user and todos
 */
async function setupUserWithTodos(email, password, todos = []) {
  const user = await createTestUser(email, password);
  const token = generateTestToken(user.id);
  
  const createdTodos = [];
  for (const todoData of todos) {
    const todo = await createTestTodo(
      user.id,
      todoData.title,
      todoData.description,
      todoData.completed
    );
    createdTodos.push(todo);
  }
  
  return {
    user,
    token,
    todos: createdTodos
  };
}

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  generateTestToken,
  generateExpiredTestToken,
  createTestTodo,
  clearUserTodos,
  getTestDbPool,
  verifyTestToken,
  setupUserWithTodos
};