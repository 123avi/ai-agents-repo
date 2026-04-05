import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment configuration constants
 * All configuration values are loaded from environment variables
 * with sensible defaults where appropriate
 */
export const ENV_CONFIG = {
  // Server Configuration
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  DATABASE: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '5432', 10),
    NAME: process.env.DB_NAME || 'todo_api',
    USER: process.env.DB_USER || '',
    PASSWORD: process.env.DB_PASSWORD || '',
  },
  
  // JWT Configuration
  JWT: {
    SECRET: process.env.JWT_SECRET || '',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  // Security Configuration
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
} as const;

/**
 * Validates that all required environment variables are set
 * @throws {Error} If required environment variables are missing
 */
export function validateEnvironment(): void {
  const required = [
    'DB_HOST',
    'DB_USER', 
    'DB_PASSWORD',
    'JWT_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (ENV_CONFIG.JWT.SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
}