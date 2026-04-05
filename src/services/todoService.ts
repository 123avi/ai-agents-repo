import { pool } from '../config/database';
import { logger } from '../utils/logger';

class TodoService {
  /**
   * Permanently deletes a todo item from the database
   * @param todoId - The ID of the todo item to delete
   * @param userId - The ID of the authenticated user
   * @returns Promise<boolean> - True if item was deleted, false if not found or no permission
   */
  async deleteTodo(todoId: string, userId: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM todos 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
      
      const result = await pool.query(query, [todoId, userId]);
      
      const wasDeleted = result.rowCount > 0;
      
      if (wasDeleted) {
        logger.info(`Todo ${todoId} deleted by user ${userId}`);
      } else {
        logger.warn(`Failed to delete todo ${todoId} - not found or no permission for user ${userId}`);
      }
      
      return wasDeleted;
    } catch (error) {
      logger.error('Error in deleteTodo service:', error);
      throw error;
    }
  }
}

export const todoService = new TodoService();