import { Pool } from 'pg';
import { User } from '../models/user.model';
import { logger } from '../utils/logger';

/**
 * User repository handling database operations for user entities
 */
export class UserRepository {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Finds user by email address
   * @param email - Email address to search for
   * @returns User object if found, null otherwise
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash, created_at, updated_at 
      FROM users 
      WHERE email = $1
    `;
    
    try {
      const result = await this.db.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as User;
    } catch (error) {
      logger.error('Database error in findByEmail:', error);
      throw error;
    }
  }
}