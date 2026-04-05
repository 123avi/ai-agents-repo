/**
 * Application configuration
 * Centralizes environment variable access and validation
 */
import dotenv from 'dotenv';

dotenv.config();

// Constants for configuration validation
const DEFAULT_PORT = 3000;
const DEFAULT_BCRYPT_ROUNDS = 12;
const DEFAULT_JWT_EXPIRES_IN = '7d';
const DEFAULT_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const DEFAULT_RATE_LIMIT_MAX = 100;

/**
 * Validates required environment variables
 * @throws Error if required variables are missing
 */
function validateConfig(): void {
  const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateConfig();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || DEFAULT_PORT.toString(), 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN,
  },
  
  // Security configuration
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || DEFAULT_BCRYPT_ROUNDS.toString(), 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || DEFAULT_RATE_LIMIT_WINDOW.toString(), 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || DEFAULT_RATE_LIMIT_MAX.toString(), 10),
};