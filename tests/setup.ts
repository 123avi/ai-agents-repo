import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(30000);

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Ensure required test environment variables are set
  const requiredEnvVars = [
    'TEST_DB_HOST',
    'TEST_DB_PORT', 
    'TEST_DB_NAME',
    'TEST_DB_USER',
    'TEST_DB_PASSWORD',
    'JWT_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingVars.length > 0) {
    console.warn(`Warning: Missing test environment variables: ${missingVars.join(', ')}`);
    console.warn('Using default values for missing variables');
  }
});

// Global test cleanup
afterAll(() => {
  // Reset environment
  delete process.env.NODE_ENV;
});