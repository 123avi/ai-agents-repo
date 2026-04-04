import { Pool } from 'pg';
import bcrypt from 'bcrypt';

/**
 * Database error codes for PostgreSQL
 */
const DB_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  NOT_NULL_VIOLATION: '23502'
} as const;

/**
 * Salt rounds for password hashing
 */
const SALT_ROUNDS = 10;

/**
 * User entity interface
 */
export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

/**
 * User creation input interface
 */
export interface CreateUserInput {
  email: string;
  password: string;
}

/**
 * Repository class for user data operations
 */
export class UserRepository {
  private pool: Pool;

  /**
   * Creates a new UserRepository instance
   * @param pool - PostgreSQL connection pool
   */
  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Creates a new user in the database
   * @param userData - User email and password
   * @returns Promise resolving to created user
   * @throws Error if email already exists or database error occurs
   */
  async createUser(userData: CreateUserInput): Promise<User> {
    const client = await this.pool.connect();
    
    try {
      const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
      
      const query = `
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING id, email, password_hash, created_at
      `;
      
      const result = await client.query(query, [userData.email, hashedPassword]);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === DB_ERROR_CODES.UNIQUE_VIOLATION) {
        throw new Error('Email already exists');
      }
      throw new Error(`Database error: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves a user by email address
   * @param email - User email to search for
   * @returns Promise resolving to user or null if not found
   * @throws Error if database error occurs
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, email, password_hash, created_at
        FROM users
        WHERE email = $1
      `;
      
      const result = await client.query(query, [email]);
      return result.rows[0] || null;
    } catch (error: any) {
      throw new Error(`Database error: ${error.message}`);
    } finally {
      client.release();
    }
  }
}