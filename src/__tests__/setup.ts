import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Environment configuration constants.
 */
const TEST_ENV_FILE = '.env.test';
const REQUIRED_TEST_VARS = ['DATABASE_URL', 'NODE_ENV'] as const;

/**
 * Sets up test environment by loading test-specific environment variables
 * and validating required configuration.
 * @throws {Error} When test environment setup fails
 */
export async function setupTestEnvironment(): Promise<void> {
  try {
    const envPath = path.resolve(process.cwd(), TEST_ENV_FILE);
    
    // Check if test environment file exists
    if (!fs.existsSync(envPath)) {
      throw new Error(`Test environment file not found: ${TEST_ENV_FILE}. Please create this file with test configuration.`);
    }

    // Load test environment variables
    const result = dotenv.config({ path: envPath });
    
    if (result.error) {
      throw new Error(`Failed to load test environment variables: ${result.error.message}`);
    }

    // Validate required environment variables
    const missingVars = REQUIRED_TEST_VARS.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required test environment variables: ${missingVars.join(', ')}. Please check your ${TEST_ENV_FILE} file.`);
    }

    // Ensure NODE_ENV is set to test
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`NODE_ENV was '${process.env.NODE_ENV}', setting to 'test' for test environment`);
      process.env.NODE_ENV = 'test';
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown setup error';
    throw new Error(`Test environment setup failed: ${errorMessage}`);
  }
}

/**
 * Cleans up test environment by removing test-specific configurations.
 * Should be called in test teardown.
 */
export function cleanupTestEnvironment(): void {
  // Remove test-specific environment variables if needed
  // This is a placeholder for any cleanup operations
}