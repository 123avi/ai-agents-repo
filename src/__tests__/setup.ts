/**
 * Jest test setup file
 * Configures global test environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Suppress console.log during tests (optional)
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}