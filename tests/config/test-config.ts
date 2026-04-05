/**
 * Test configuration constants and utilities
 * Centralized configuration for integration tests
 */
export const testConfig = {
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    name: process.env.TEST_DB_NAME || 'todo_test',
    user: process.env.TEST_DB_USER || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    maxConnections: 10,
    idleTimeout: 30000,
    connectionTimeout: 2000,
  },
  api: {
    baseUrl: process.env.TEST_API_URL || 'http://localhost:3000',
    responseTimeThreshold: parseInt(process.env.API_RESPONSE_TIME_THRESHOLD || '500', 10),
  },
  performance: {
    concurrentUsers: parseInt(process.env.CONCURRENT_USERS || '100', 10),
    testIterations: parseInt(process.env.TEST_ITERATIONS || '10', 10),
  },
  timeouts: {
    test: parseInt(process.env.TEST_TIMEOUT || '30000', 10),
    request: parseInt(process.env.REQUEST_TIMEOUT || '5000', 10),
  },
};

/**
 * Test data factories
 */
export const testDataFactory = {
  /**
   * Generate valid user registration data
   */
  createUserData: (suffix = ''): { email: string; password: string } => ({
    email: `testuser${suffix}@example.com`,
    password: 'SecurePass123!',
  }),

  /**
   * Generate valid todo data
   */
  createTodoData: (suffix = ''): { title: string; description: string; due_date?: string } => ({
    title: `Test Todo${suffix}`,
    description: `Test description for todo${suffix}`,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  }),

  /**
   * Generate invalid email formats for validation testing
   */
  getInvalidEmails: (): string[] => [
    'invalid-email',
    '@domain.com',
    'user@',
    'user.domain.com',
    'user@domain',
    '',
  ],

  /**
   * Generate weak passwords for validation testing
   */
  getWeakPasswords: (): string[] => [
    '123',
     'password',
    '12345678',
    'abcdefgh',
    'Password', // No number or special char
    'password123', // No uppercase or special char
    '',
  ],
};

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Generate unique test identifier
   */
  generateTestId: (): string => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Wait for specified duration
   */
  wait: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Measure execution time of async function
   */
  measureTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    return { result, duration };
  },

  /**
   * Validate JWT token format
   */
  isValidJWTFormat: (token: string): boolean => {
    return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token);
  },
};