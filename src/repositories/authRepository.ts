import { Pool, PoolClient } from 'pg';
import { User } from '../types/user';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Repository for user authentication operations
 * Implements data access layer for user registration and login
 */
export class AuthRepository {
  /**
   * Creates a new user account with duplicate email prevention
   * @param email - User's email address
   * @param hashedPassword - Bcrypt hashed password
   * @returns Promise resolving to created user object
   * @throws Error if email already exists or database operation fails
   */
  async createUser(email: string, hashedPassword: string): Promise<User> {
    let client: PoolClient | undefined;
    
    try {
      client = await pool.connect();
      
      // Check for duplicate email first
      const duplicateCheck = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (duplicateCheck.rows.length > 0) {
        throw new Error('Email already exists');
      }
      
      // Insert new user
      const result = await client.query(
        'INSERT INTO users (email, password_hash, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, email, created_at, updated_at',
        [email, hashedPassword]
      );
      
      const user: User = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      };
      
      logger.info('User created successfully', { userId: user.id, email });
      return user;
      
    } catch (error) {
      logger.error('Failed to create user', { email, error: error.message });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  /**
   * Finds a user by email address
   * @param email - User's email address to search for
   * @returns Promise resolving to user object with password hash, or null if not found
   */
  async findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    let client: PoolClient | undefined;
    
    try {
      client = await pool.connect();
      
      const result = await client.query(
        'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      
    } catch (error) {
      logger.error('Failed to find user by email', { email, error: error.message });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}