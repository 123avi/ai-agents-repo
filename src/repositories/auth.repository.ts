import { Pool } from 'pg';
import { logger } from '../utils/logger';

interface User {
  id: string;
  email: string;
  password: string;
  created_at: Date;
}

/**
 * Repository for user authentication data access
 * Handles database operations for user accounts
 */
export class AuthRepository {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Find user by email address
   * 
   * @param email - User email address
   * @returns Promise<User | null> - User record or null if not found
   */
  public async findByEmail(email: string): Promise<User | null> {
    try {
      const query = 'SELECT id, email, password, created_at FROM users WHERE email = $1';
      const result = await this.db.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as User;
    } catch (error) {
      logger.error('Error finding user by email', { error, email });
      throw new Error('Database query failed');
    }
  }

  /**
   * Create a new user account
   * 
   * @param email - User email address
   * @param hashedPassword - Hashed password
   * @returns Promise<string> - Created user ID
   */
  public async create(email: string, hashedPassword: string): Promise<string> {
    try {
      const query = `
        INSERT INTO users (email, password, created_at) 
        VALUES ($1, $2, NOW()) 
        RETURNING id
      `;
      const result = await this.db.query(query, [email, hashedPassword]);
      
      const userId = result.rows[0].id;
      logger.info('User created in database', { email, userId });
      
      return userId;
    } catch (error) {
      logger.error('Error creating user', { error, email });
      throw new Error('Failed to create user');
    }
  }

  /**
   * Find user by ID
   * 
   * @param id - User ID
   * @returns Promise<User | null> - User record or null if not found
   */
  public async findById(id: string): Promise<User | null> {
    try {
      const query = 'SELECT id, email, password, created_at FROM users WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as User;
    } catch (error) {
      logger.error('Error finding user by ID', { error, id });
      throw new Error('Database query failed');
    }
  }
}