import dotenv from 'dotenv';
import { SERVER_CONSTANTS, ENVIRONMENT } from '../constants/server.js';

// Load environment variables
dotenv.config();

/**
 * Environment configuration with validation and defaults
 */
class EnvironmentConfig {
  public readonly port: number;
  public readonly nodeEnv: string;
  public readonly jwtSecret: string;
  public readonly corsOrigin: string;
  public readonly databaseUrl: string;

  constructor() {
    this.port = this.getNumberEnv('PORT', SERVER_CONSTANTS.DEFAULT_PORT);
    this.nodeEnv = this.getStringEnv('NODE_ENV', ENVIRONMENT.DEVELOPMENT);
    this.jwtSecret = this.getRequiredStringEnv('JWT_SECRET');
    this.corsOrigin = this.getStringEnv('CORS_ORIGIN', '*');
    this.databaseUrl = this.getRequiredStringEnv('DATABASE_URL');
  }

  /**
   * Get required string environment variable
   */
  private getRequiredStringEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * Get optional string environment variable with default
   */
  private getStringEnv(key: string, defaultValue: string): string {
    return process.env[key] ?? defaultValue;
  }

  /**
   * Get number environment variable with default
   */
  private getNumberEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) {
      return defaultValue;
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a valid number`);
    }
    return parsed;
  }

  /**
   * Check if running in production environment
   */
  public isProduction(): boolean {
    return this.nodeEnv === ENVIRONMENT.PRODUCTION;
  }

  /**
   * Check if running in development environment
   */
  public isDevelopment(): boolean {
    return this.nodeEnv === ENVIRONMENT.DEVELOPMENT;
  }
}

export const config = new EnvironmentConfig();