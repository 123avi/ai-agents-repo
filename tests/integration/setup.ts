import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.join(__dirname, '../../.env.test') });

/**
 * Global test setup and configuration.
 * Configures test environment and database connection.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const API_PORT = process.env.API_PORT || '3001';

if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL environment variable is required for integration tests');
}

// Set test-specific timeouts
jest.setTimeout(30000); // 30 seconds for integration tests

// Global test database cleanup utility
export const cleanupDatabase = async (): Promise<void> => {
  // This will be implemented by the DatabaseManager
  // Left as placeholder for test infrastructure
};

// Export test configuration constants
export const TEST_CONFIG = {
  DATABASE_URL: TEST_DATABASE_URL,
  API_PORT: parseInt(API_PORT, 10),
  JWT_SECRET: process.env.JWT_SECRET || 'test-secret-key',
  BCRYPT_ROUNDS: 10, // Lower rounds for faster tests
  PERFORMANCE_THRESHOLD_MS: 500,
  CONCURRENT_USERS_COUNT: 10
} as const;
