import { User } from '../types/user.types';
import { DatabaseConnection } from '../database/connection';
import { logger } from '../utils/logger';

/**
 * Repository for user authentication data access
 */
export class AuthRepository {
  private db: DatabaseConnection;

  constructor() {
    this.db = new DatabaseConnection();
  }

  /**
   * Finds user by email address
   * @param email User email
   * @returns User object or null if not found
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const query = 'SELECT id, email, password, created_at FROM users WHERE email = $1';
      const result = await this.db.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as User;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Creates new user account
   * @param email User email
   * @param hashedPassword Bcrypt hashed password
   * @returns Created user object
   */
  async createUser(email: string, hashedPassword: string): Promise<User> {
    try {
      const query = `
        INSERT INTO users (email, password, created_at) 
        VALUES ($1, $2, NOW()) 
        RETURNING id, email, created_at
      `;
      const result = await this.db.query(query, [email, hashedPassword]);
      
      return result.rows[0] as User;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }
}