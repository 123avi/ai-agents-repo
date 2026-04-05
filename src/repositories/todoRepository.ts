import { Pool } from 'pg';
import { dbPool } from '../config/database';
import { Todo } from '../types/todo';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface CreateTodoData {
  userId: string;
  title: string;
  description?: string;
  due_date?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Repository for todo data access operations
 * Handles database interactions for todo entities
 */
class TodoRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Creates a new todo item in the database
   * @param todoData - Complete todo data including all fields
   * @returns Promise resolving to created todo with generated ID
   */
  async create(todoData: CreateTodoData): Promise<Todo> {
    const client = await this.pool.connect();
    
    try {
      const id = uuidv4();
      const query = `
        INSERT INTO todos (id, user_id, title, description, due_date, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        id,
        todoData.userId,
        todoData.title,
        todoData.description || null,
        todoData.due_date || null,
        todoData.status,
        todoData.created_at,
        todoData.updated_at
      ];

      const result = await client.query(query, values);
      return result.rows[0] as Todo;
    } catch (error) {
      logger.error('Database error creating todo', { error: error.message, userId: todoData.userId });
      throw error;
    } finally {
      client.release();
    }
  }
}

export const todoRepository = new TodoRepository(dbPool);