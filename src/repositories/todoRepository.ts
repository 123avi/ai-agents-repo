import { Pool } from 'pg';
import { dbPool } from '../config/database';
import { Todo } from '../models/Todo';
import { logger } from '../utils/logger';

const FIND_TODOS_BY_USER_QUERY = 'SELECT id, title, description, status, created_at, updated_at FROM todos WHERE user_id = $1 ORDER BY created_at DESC';

/**
 * Repository for todo data access operations
 */
class TodoRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Finds all todos for a specific user
   * @param userId - The ID of the user whose todos to find
   * @returns Promise<Todo[]> - Array of todos or empty array if none found
   */
  async findByUserId(userId: number): Promise<Todo[]> {
    try {
      const result = await this.pool.query(FIND_TODOS_BY_USER_QUERY, [userId]);
      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        userId: userId,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error(`Database error finding todos for user ${userId}:`, error);
      throw error;
    }
  }
}

export const todoRepository = new TodoRepository(dbPool);