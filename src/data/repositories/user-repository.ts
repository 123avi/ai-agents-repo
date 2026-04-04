import { Pool, PoolClient } from 'pg';
import { DatabaseError } from '../../errors/database-error';
import { ConflictError } from '../../errors/conflict-error';

/**
 * User data structure for database operations
 */
export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

/**
 * Input data for creating a new user
 */
export interface CreateUserInput {
  email: string;
  password_hash: string;
}

/**
 * Repository for user data persistence operations
 */
export class UserRepository {
  private pool: Pool;

  /**
   * Creates a new UserRepository instance
   * @param pool - Database connection pool
   */
  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Creates a new user with email uniqueness check
   * @param userData - User data to create
   * @returns Promise resolving to created user
   * @throws ConflictError if email already exists
   * @throws DatabaseError for database connection issues
   */
  async createUser(userData: CreateUserInput): Promise<User> {
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      
      const insertQuery = `
        INSERT INTO users (email, password_hash, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id, email, password_hash, created_at
      `;
      
      const result = await client.query(insertQuery, [
        userData.email,
        userData.password_hash
      ]);
      
      return result.rows[0] as User;
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new ConflictError('Email already exists');
      }
      throw new DatabaseError(`Failed to create user: ${error.message}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Finds a user by email address for authentication
   * @param email - Email address to search for
   * @returns Promise resolving to user or null if not found
   * @throws DatabaseError for database connection issues
   */
  async findUserByEmail(email: string): Promise<User | null> {
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      
      const selectQuery = `
        SELECT id, email, password_hash, created_at
        FROM users
        WHERE email = $1
      `;
      
      const result = await client.query(selectQuery, [email]);
      
      return result.rows.length > 0 ? result.rows[0] as User : null;
    } catch (error: any) {
      throw new DatabaseError(`Failed to find user: ${error.message}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}