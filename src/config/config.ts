import dotenv from 'dotenv';

dotenv.config();

/**
 * Application configuration loaded from environment variables
 */
export const config = {
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL,
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h'
} as const;