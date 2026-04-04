import { config } from 'dotenv';

/**
 * Test environment configuration setup
 * Loads environment variables for integration tests
 */
function setupTestEnvironment(): void {
  // Load test environment variables
  config({ path: '.env.test' });
  
  // Set test-specific environment variables
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = process.env.TEST_DB_NAME || 'todo_api_test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
}

/**
 * Global test timeout configuration
 */
const TEST_TIMEOUT_MS = 10000;

// Setup test environment before running tests
setupTestEnvironment();

// Configure Jest timeout
jest.setTimeout(TEST_TIMEOUT_MS);

export { setupTestEnvironment, TEST_TIMEOUT_MS };