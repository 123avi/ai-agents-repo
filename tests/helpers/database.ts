import { DataSource } from 'typeorm';
import { User } from '../../src/models/User';

const TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
const TEST_DB_PORT = parseInt(process.env.TEST_DB_PORT || '5433');
const TEST_DB_NAME = process.env.TEST_DB_NAME || 'todoapi_test';
const TEST_DB_USER = process.env.TEST_DB_USER || 'test_user';
const TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test_password';

let testDataSource: DataSource;

/**
 * Initialize database connection for testing
 * Creates a separate test database connection with clean state
 */
export const connectDB = async (): Promise<void> => {
  try {
    testDataSource = new DataSource({
      type: 'postgres',
      host: TEST_DB_HOST,
      port: TEST_DB_PORT,
      username: TEST_DB_USER,
      password: TEST_DB_PASSWORD,
      database: TEST_DB_NAME,
      entities: [User],
      synchronize: true,
      dropSchema: true,
      logging: false
    });

    await testDataSource.initialize();
    console.log('Test database connected successfully');
  } catch (error) {
    console.error('Test database connection failed:', error);
    throw error;
  }
};

/**
 * Close database connection after testing
 * Cleans up the test database connection
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    if (testDataSource && testDataSource.isInitialized) {
      await testDataSource.destroy();
      console.log('Test database disconnected successfully');
    }
  } catch (error) {
    console.error('Error disconnecting test database:', error);
    throw error;
  }
};

/**
 * Clear all data from test database tables
 * Ensures clean state between test runs
 */
export const clearDatabase = async (): Promise<void> => {
  try {
    if (!testDataSource || !testDataSource.isInitialized) {
      throw new Error('Test database not connected');
    }

    const entities = testDataSource.entityMetadatas;
    
    for (const entity of entities) {
      const repository = testDataSource.getRepository(entity.name);
      await repository.clear();
    }
  } catch (error) {
    console.error('Error clearing test database:', error);
    throw error;
  }
};

/**
 * Get test database connection instance
 * Provides access to test database for specific operations
 */
export const getTestDataSource = (): DataSource => {
  if (!testDataSource || !testDataSource.isInitialized) {
    throw new Error('Test database not connected');
  }
  return testDataSource;
};