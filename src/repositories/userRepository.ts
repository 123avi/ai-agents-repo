import { Pool, PoolClient } from 'pg';
import { User } from '../models/User';
import { CreateUserData } from '../types/user';

/**
 * Repository for user data access operations
 * Implements CRUD operations with PostgreSQL using parameterized queries
 */
export class UserRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Creates a new user with duplicate email detection
   * @param userData - User data containing email and hashed password
   * @returns Promise resolving to created user or error
   * @throws Error with code 'DUPLICATE_EMAIL' if email already exists
   */
  async createUser(userData: CreateUserData): Promise<User> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO users (email, password_hash, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING id, email, created_at, updated_at
      `;
      
      const result = await client.query(query, [userData.email, userData.passwordHash]);
      return result.rows[0] as User;
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'users_email_unique') {
        const duplicateError = new Error('Email already exists');
        (duplicateError as any).code = 'DUPLICATE_EMAIL';
        throw duplicateError;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Finds a user by email address for authentication
   * @param email - Email address to search for
   * @returns Promise resolving to user with password hash or null if not found
   */
  async findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, email, password_hash as "passwordHash", created_at, updated_at
        FROM users
        WHERE email = $1
      `;
      
      const result = await client.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Finds a user by ID
   * @param id - User ID to search for
   * @returns Promise resolving to user or null if not found
   */
  async findUserById(id: number): Promise<User | null> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, email, created_at, updated_at
        FROM users
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
}