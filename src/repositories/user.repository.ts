import { Pool } from 'pg';
import { logger } from '../utils/logger';

interface CreateUserData {
  id: string;
  email: string;
  passwordHash: string;
}

interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Repository for user database operations
 */
export class UserRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Creates a new user in the database
   * @param userData - User data to create
   */
  async create(userData: CreateUserData): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO users (id, email, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `;
      await client.query(query, [userData.id, userData.email, userData.passwordHash]);
      logger.info('User created in database', { userId: userData.id });
    } catch (error) {
      logger.error('Failed to create user', { error: error.message, userId: userData.id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Finds a user by email address
   * @param email - Email address to search for
   * @returns User object if found, null otherwise
   */
  async findByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await client.query(query, [email]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Failed to find user by email', { error: error.message, email });
      throw error;
    } finally {
      client.release();
    }
  }
}