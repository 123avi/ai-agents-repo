/**
 * User data access layer
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';

interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// Database connection pool - this would be injected or imported from a database module
declare const pool: Pool;

/**
 * Retrieves user by email address
 * @param email - User email address
 * @returns User data or null if not found
 * @throws {Error} If database operation fails
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const query = 'SELECT id, email, password_hash as "passwordHash", created_at as "createdAt" FROM users WHERE email = $1';
  
  try {
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to retrieve user by email', { email, error });
    throw error;
  }
}