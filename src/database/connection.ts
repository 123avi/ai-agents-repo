import { Pool, PoolConfig, Client } from 'pg';
import { logger } from '../utils/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const CONNECTION_TIMEOUT_MS = 5000;

/**
 * Database connection pool manager with retry logic and health checks
 */
export class DatabaseConnection {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor(private config: PoolConfig) {
    this.pool = new Pool({
      ...config,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
      idleTimeoutMillis: 30000,
      max: 10,
      min: 2
    });

    this.pool.on('error', (err) => {
      logger.error('Database pool error:', err);
      this.isConnected = false;
    });
  }

  /**
   * Establishes connection to the database with retry logic
   */
  async connect(): Promise<void> {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();
        this.isConnected = true;
        logger.info('Database connection established');
        return;
      } catch (error) {
        attempt++;
        logger.error(`Connection attempt ${attempt} failed:`, error);
        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY_MS * attempt);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Gets a client from the pool
   */
  async getClient(): Promise<Client> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return this.pool.connect();
  }

  /**
   * Executes a query with automatic client management
   */
  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  /**
   * Closes all connections and shuts down the pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    logger.info('Database connection closed');
  }

  /**
   * Checks if the database is healthy and connected
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}