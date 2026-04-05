import { Pool } from 'pg';
import { User } from '../types/user';

/**
 * Repository for user data access operations
 */
export class UserRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Finds a user by email address
   * @param email - User's email address
   * @returns User object or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const query = 'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1';
      const result = await this.pool.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as User;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }
}