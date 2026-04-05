import { Pool } from 'pg';
import { User } from '../types/user.interface';
import { getDbPool } from '../database/connection';

/**
 * Retrieves user by email address
 * @param email - User email to search for
 * @returns Promise<User | null> - User data or null if not found
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const pool = getDbPool();
  
  try {
    const query = 'SELECT id, email, password_hash, created_at FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as User;
  } catch (error) {
    console.error('Database error in getUserByEmail:', error);
    throw new Error('Failed to retrieve user from database');
  }
}