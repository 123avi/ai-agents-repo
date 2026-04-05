import { pool } from '../config/database';
import { logger } from '../utils/logger';

interface UpdateTodoData {
  title?: string;
  description?: string;
  due_date?: string;
  status?: 'open' | 'done';
}

interface Todo {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: 'open' | 'done';
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

class TodoService {
  /**
   * Updates a todo item if it exists and belongs to the specified user
   * @param todoId - The ID of the todo to update
   * @param userId - The ID of the user who owns the todo
   * @param updateData - The fields to update
   * @returns The updated todo or null if not found/unauthorized
   */
  async updateTodo(todoId: string, userId: string, updateData: UpdateTodoData): Promise<Todo | null> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (updateData.title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        values.push(updateData.title);
      }
      if (updateData.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(updateData.description);
      }
      if (updateData.due_date !== undefined) {
        fields.push(`due_date = $${paramIndex++}`);
        values.push(updateData.due_date);
      }
      if (updateData.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updateData.status);
      }

      fields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      values.push(todoId, userId);

      const query = `
        UPDATE todos 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Database error updating todo:', error);
      throw error;
    }
  }
}

export const todoService = new TodoService();