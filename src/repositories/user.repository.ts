import { Pool } from 'pg';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  email: string;
  password: string;
  created_at?: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
}

/**
 * User repository handling database operations for user entities
 */
export class UserRepository {
  constructor(private db: Pool) {}

  /**
   * Creates a new user in the database
   * @param userData User data containing email and hashed password
   * @returns Promise resolving to new user ID
   */
  async create(userData: CreateUserData): Promise<string> {
    try {
      const query = `
        INSERT INTO users (email, password, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id
      `;
      
      const result = await this.db.query(query, [
        userData.email,
        userData.password
      ]);
      
      return result.rows[0].id;
    } catch (error: any) {
      logger.error('Database error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Finds a user by email address
   * @param email User email address
   * @returns Promise resolving to user or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const query = 'SELECT id, email, password, created_at FROM users WHERE email = $1';
      const result = await this.db.query(query, [email]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error: any) {
      logger.error('Database error finding user by email:', error);
      throw new Error('Failed to find user');
    }
  }
}