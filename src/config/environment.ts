import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  ssl: boolean;
}

interface Config {
  database: DatabaseConfig;
  nodeEnv: string;
}

/**
 * Application configuration loaded from environment variables
 * Ensures all required database connection parameters are present
 */
export const config: Config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'todo_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true'
  },
  nodeEnv: process.env.NODE_ENV || 'development'
};

/**
 * Validates that all required environment variables are present
 * Throws error if critical configuration is missing
 */
export function validateEnvironmentConfig(): void {
  const requiredVars = [
    'DB_HOST',
    'DB_PORT', 
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (isNaN(config.database.port) || config.database.port <= 0) {
    throw new Error('DB_PORT must be a valid positive integer');
  }
}