import { Pool } from 'pg';
import { Todo, TodoCreateInput, TodoUpdateInput } from '../types/todo.types';
import { DatabaseError } from '../errors/database.error';
import { logger } from '../utils/logger';

/**
 * Repository for managing todo items with user isolation at the data layer.
 * Provides CRUD operations ensuring user ownership validation.
 */
export class TodoRepository {
  private static readonly DEFAULT_STATUS = 'open';
  
  constructor(private db: Pool) {}

  /**
   * Creates a new todo item associated with the specified user.
   * @param userId - The ID of the user creating the todo
   * @param todoData - The todo data to create
   * @returns Promise resolving to the created todo item
   * @throws DatabaseError if creation fails
   */
  async create(userId: string, todoData: TodoCreateInput): Promise<Todo> {
    try {
      const query = `
        INSERT INTO todos (user_id, title, description, due_date, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, user_id, title, description, due_date, status, created_at, updated_at
      `;
      
      const values = [
        userId,
        todoData.title,
        todoData.description || null,
        todoData.due_date || null,
        todoData.status || TodoRepository.DEFAULT_STATUS
      ];
      
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create todo item');
      }
      
      logger.info('Todo created', { todoId: result.rows[0].id, userId });
      return this.mapRowToTodo(result.rows[0]);
    } catch (error) {
      logger.error('Error creating todo', { error, userId });
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError('Failed to create todo item');
    }
  }

  /**
   * Finds all todo items belonging to the specified user.
   * @param userId - The ID of the user whose todos to retrieve
   * @returns Promise resolving to array of todo items
   * @throws DatabaseError if query fails
   */
  async findByUserId(userId: string): Promise<Todo[]> {
    try {
      const query = `
        SELECT id, user_id, title, description, due_date, status, created_at, updated_at
        FROM todos
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query, [userId]);
      
      logger.debug('Todos retrieved', { userId, count: result.rows.length });
      return result.rows.map(row => this.mapRowToTodo(row));
    } catch (error) {
      logger.error('Error finding todos by user ID', { error, userId });
      throw new DatabaseError('Failed to retrieve todo items');
    }
  }

  /**
   * Finds a single todo item by ID with user ownership validation.
   * @param todoId - The ID of the todo item to find
   * @param userId - The ID of the user who should own the todo
   * @returns Promise resolving to the todo item or null if not found
   * @throws DatabaseError if query fails
   */
  async findByIdAndUserId(todoId: string, userId: string): Promise<Todo | null> {
    try {
      const query = `
        SELECT id, user_id, title, description, due_date, status, created_at, updated_at
        FROM todos
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await this.db.query(query, [todoId, userId]);
      
      if (result.rows.length === 0) {
        logger.debug('Todo not found or user not authorized', { todoId, userId });
        return null;
      }
      
      logger.debug('Todo retrieved by ID', { todoId, userId });
      return this.mapRowToTodo(result.rows[0]);
    } catch (error) {
      logger.error('Error finding todo by ID and user ID', { error, todoId, userId });
      throw new DatabaseError('Failed to retrieve todo item');
    }
  }

  /**
   * Updates a todo item with ownership validation.
   * @param todoId - The ID of the todo item to update
   * @param userId - The ID of the user who should own the todo
   * @param updateData - The data to update
   * @returns Promise resolving to the updated todo item or null if not found
   * @throws DatabaseError if update fails
   */
  async update(todoId: string, userId: string, updateData: TodoUpdateInput): Promise<Todo | null> {
    try {
      const setClauses = [];
      const values = [];
      let paramIndex = 1;
      
      if (updateData.title !== undefined) {
        setClauses.push(`title = $${paramIndex++}`);
        values.push(updateData.title);
      }
      
      if (updateData.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(updateData.description);
      }
      
      if (updateData.due_date !== undefined) {
        setClauses.push(`due_date = $${paramIndex++}`);
        values.push(updateData.due_date);
      }
      
      if (updateData.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(updateData.status);
      }
      
      if (setClauses.length === 0) {
        const existing = await this.findByIdAndUserId(todoId, userId);
        return existing;
      }
      
      setClauses.push(`updated_at = NOW()`);
      values.push(todoId, userId);
      
      const query = `
        UPDATE todos
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
        RETURNING id, user_id, title, description, due_date, status, created_at, updated_at
      `;
      
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        logger.debug('Todo not found or user not authorized for update', { todoId, userId });
        return null;
      }
      
      logger.info('Todo updated', { todoId, userId });
      return this.mapRowToTodo(result.rows[0]);
    } catch (error) {
      logger.error('Error updating todo', { error, todoId, userId });
      throw new DatabaseError('Failed to update todo item');
    }
  }

  /**
   * Deletes a todo item with ownership validation.
   * @param todoId - The ID of the todo item to delete
   * @param userId - The ID of the user who should own the todo
   * @returns Promise resolving to true if deleted, false if not found
   * @throws DatabaseError if deletion fails
   */
  async delete(todoId: string, userId: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM todos
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await this.db.query(query, [todoId, userId]);
      
      const deleted = result.rowCount > 0;
      
      if (deleted) {
        logger.info('Todo deleted', { todoId, userId });
      } else {
        logger.debug('Todo not found or user not authorized for deletion', { todoId, userId });
      }
      
      return deleted;
    } catch (error) {
      logger.error('Error deleting todo', { error, todoId, userId });
      throw new DatabaseError('Failed to delete todo item');
    }
  }

  /**
   * Maps a database row to a Todo object.
   * @param row - Database row data
   * @returns Mapped Todo object
   */
  private mapRowToTodo(row: any): Todo {
    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      description: row.description,
      due_date: row.due_date,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}