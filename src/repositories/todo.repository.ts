import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

/**
 * Configuration constants for todo repository operations
 */
const DEFAULT_STATUS = 'open' as const;
const MAX_TITLE_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1000;

/**
 * Interface representing a todo item in the database
 */
export interface TodoItem {
  id: number;
  title: string;
  description?: string;
  status: 'open' | 'completed';
  user_id: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Data transfer object for creating a new todo item
 */
export interface CreateTodoDto {
  title: string;
  description?: string;
  user_id: number;
}

/**
 * Data transfer object for updating an existing todo item
 */
export interface UpdateTodoDto {
  title?: string;
  description?: string;
  status?: 'open' | 'completed';
}

/**
 * Repository class for todo item persistence with user isolation
 * Ensures all operations are scoped to the authenticated user
 */
export class TodoRepository {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  /**
   * Creates a new todo item associated with the specified user
   * @param todoData - The todo item data to create
   * @returns Promise resolving to the created todo item
   */
  async create(todoData: CreateTodoDto): Promise<TodoItem> {
    const client = await this.getClient();
    try {
      this.validateCreateInput(todoData);
      
      const query = `
        INSERT INTO todos (title, description, status, user_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `;
      
      const values = [
        todoData.title.trim(),
        todoData.description?.trim() || null,
        DEFAULT_STATUS,
        todoData.user_id
      ];
      
      const result = await client.query(query, values);
      logger.info('Todo created', { todoId: result.rows[0].id, userId: todoData.user_id });
      
      return this.mapRowToTodoItem(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create todo', { error, userId: todoData.user_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Finds all todo items for a specific user
   * @param userId - The ID of the user to find todos for
   * @returns Promise resolving to array of todo items
   */
  async findByUserId(userId: number): Promise<TodoItem[]> {
    const client = await this.getClient();
    try {
      const query = `
        SELECT * FROM todos 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [userId]);
      logger.debug('Todos retrieved', { userId, count: result.rows.length });
      
      return result.rows.map(row => this.mapRowToTodoItem(row));
    } catch (error) {
      logger.error('Failed to find todos', { error, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Updates a todo item with ownership validation
   * @param todoId - The ID of the todo item to update
   * @param userId - The ID of the user attempting the update
   * @param updates - The updates to apply
   * @returns Promise resolving to the updated todo item or null if not found/unauthorized
   */
  async update(todoId: number, userId: number, updates: UpdateTodoDto): Promise<TodoItem | null> {
    const client = await this.getClient();
    try {
      this.validateUpdateInput(updates);
      
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (updates.title !== undefined) {
        setClauses.push(`title = $${paramCount++}`);
        values.push(updates.title.trim());
      }
      
      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramCount++}`);
        values.push(updates.description?.trim() || null);
      }
      
      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramCount++}`);
        values.push(updates.status);
      }
      
      if (setClauses.length === 0) {
        throw new Error('No valid updates provided');
      }
      
      setClauses.push(`updated_at = NOW()`);
      values.push(todoId, userId);
      
      const query = `
        UPDATE todos 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramCount++} AND user_id = $${paramCount++}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        logger.warn('Todo update failed - not found or unauthorized', { todoId, userId });
        return null;
      }
      
      logger.info('Todo updated', { todoId, userId });
      return this.mapRowToTodoItem(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update todo', { error, todoId, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a todo item with ownership validation
   * @param todoId - The ID of the todo item to delete
   * @param userId - The ID of the user attempting the deletion
   * @returns Promise resolving to true if deleted, false if not found/unauthorized
   */
  async delete(todoId: number, userId: number): Promise<boolean> {
    const client = await this.getClient();
    try {
      const query = `
        DELETE FROM todos 
        WHERE id = $1 AND user_id = $2
      `;
      
      const result = await client.query(query, [todoId, userId]);
      const deleted = result.rowCount > 0;
      
      if (deleted) {
        logger.info('Todo deleted', { todoId, userId });
      } else {
        logger.warn('Todo deletion failed - not found or unauthorized', { todoId, userId });
      }
      
      return deleted;
    } catch (error) {
      logger.error('Failed to delete todo', { error, todoId, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gets a database client from the connection pool
   * @returns Promise resolving to a database client
   */
  private async getClient(): Promise<PoolClient> {
    try {
      return await this.db.connect();
    } catch (error) {
      logger.error('Failed to get database client', { error });
      throw new Error('Database connection failed');
    }
  }

  /**
   * Maps a database row to a TodoItem object
   * @param row - The database row to map
   * @returns The mapped TodoItem
   */
  private mapRowToTodoItem(row: any): TodoItem {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      user_id: row.user_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Validates input for creating a todo item
   * @param todoData - The todo data to validate
   */
  private validateCreateInput(todoData: CreateTodoDto): void {
    if (!todoData.title?.trim()) {
      throw new Error('Title is required');
    }
    if (todoData.title.trim().length > MAX_TITLE_LENGTH) {
      throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
    }
    if (todoData.description && todoData.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
    }
    if (!Number.isInteger(todoData.user_id) || todoData.user_id <= 0) {
      throw new Error('Valid user_id is required');
    }
  }

  /**
   * Validates input for updating a todo item
   * @param updates - The update data to validate
   */
  private validateUpdateInput(updates: UpdateTodoDto): void {
    if (updates.title !== undefined) {
      if (!updates.title?.trim()) {
        throw new Error('Title cannot be empty');
      }
      if (updates.title.trim().length > MAX_TITLE_LENGTH) {
        throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
      }
    }
    if (updates.description !== undefined && updates.description && updates.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
    }
    if (updates.status !== undefined && !['open', 'completed'].includes(updates.status)) {
      throw new Error('Status must be either "open" or "completed"');
    }
  }
}