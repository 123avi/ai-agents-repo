import { Pool, PoolClient } from 'pg';
import { User } from '../types/user.types';
import { DatabaseError, DuplicateEmailError } from '../types/errors';

/**
 * Repository class for user authentication data access operations.
 * Implements parameterized queries to prevent SQL injection attacks.
 */
export class AuthRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Creates a new user account with duplicate email prevention.
   * @param email - User's email address
   * @param hashedPassword - Bcrypt hashed password
   * @returns Promise resolving to the created user (without password)
   * @throws DuplicateEmailError if email already exists
   * @throws DatabaseError for other database failures
   */
  async createUser(email: string, hashedPassword: string): Promise<User> {
    let client: PoolClient;
    
    try {
      client = await this.pool.connect();
      
      // Check for existing email using parameterized query
      const existingUserResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (existingUserResult.rows.length > 0) {
        throw new DuplicateEmailError(`User with email ${email} already exists`);
      }
      
      // Insert new user with parameterized query
      const insertResult = await client.query(
        'INSERT INTO users (email, password_hash, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, email, created_at, updated_at',
        [email, hashedPassword]
      );
      
      return insertResult.rows[0] as User;
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        throw error;
      }
      
      console.error('Database error in createUser:', error);
      throw new DatabaseError('Failed to create user account');
    } finally {
      if (client!) {
        client.release();
      }
    }
  }

  /**
   * Finds a user by email address.
   * @param email - User's email address to search for
   * @returns Promise resolving to user with password hash, or null if not found
   * @throws DatabaseError for database failures
   */
  async findUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    let client: PoolClient;
    
    try {
      client = await this.pool.connect();
      
      const result = await client.query(
        'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0] as User & { password_hash: string };
    } catch (error) {
      console.error('Database error in findUserByEmail:', error);
      throw new DatabaseError('Failed to find user by email');
    } finally {
      if (client!) {
        client.release();
      }
    }
  }
}