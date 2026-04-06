import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Database configuration constants
 */
const DB_CONFIG = {
  LOG_LEVELS: NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] as const : ['error'] as const,
  CONNECTION_TIMEOUT: 10000,
  POOL_TIMEOUT: 5000,
} as const;

/**
 * Validates database configuration
 * @throws {Error} If DATABASE_URL is not provided
 */
function validateDatabaseConfig(): void {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
}

/**
 * Creates and configures Prisma client instance
 * @returns {PrismaClient} Configured Prisma client
 */
function createPrismaClient(): PrismaClient {
  try {
    validateDatabaseConfig();
    
    return new PrismaClient({
      log: DB_CONFIG.LOG_LEVELS,
      datasources: {
        db: {
          url: DATABASE_URL,
        },
      },
    });
  } catch (error) {
    console.error('Failed to create Prisma client:', error);
    throw error;
  }
}

/**
 * Global Prisma client instance
 */
export const prisma = createPrismaClient();

/**
 * Gracefully disconnect from database
 * @returns {Promise<void>}
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
    throw error;
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}